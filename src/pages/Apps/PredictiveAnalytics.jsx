import React, { useState, useEffect, useMemo } from "react";
import {
  LuBrainCircuit,
  LuTrendingUp,
  LuTrendingDown,
  LuTriangleAlert,
  LuCircleCheck,
  LuShieldAlert,
  LuUsers,
  LuCalendar,
  LuClock,
  LuActivity,
  LuFlame,
  LuUserX,
  LuUserCheck,
  LuRefreshCw,
  LuSearch,
  LuFilter,
  LuBriefcase,
  LuArrowRight,
  LuSparkles,
  LuInfo,
  LuBuilding2,
  LuLayers,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api/axios";

export default function PredictiveAnalytics() {
  const [activeTab, setActiveTab] = useState("attrition"); // 'attrition' | 'absenteeism' | 'recruitment'
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Filters for Attrition Table
  const [attritionSearch, setAttritionSearch] = useState("");
  const [attritionDeptFilter, setAttritionDeptFilter] = useState("All");
  const [attritionRiskFilter, setAttritionRiskFilter] = useState("All");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get("/analytics/predictive");
      if (res.data?.success && res.data.data) {
        setAnalyticsData(res.data.data);
      } else {
        toast.error(res.data?.error || "Failed to load predictive analytics");
      }
    } catch (err) {
      console.error("Predictive analytics error:", err);
      toast.error(err.response?.data?.error || "Failed to load predictive analytics data");
    } finally {
      setLoading(false);
    }
  };

  const attrition = analyticsData?.attritionRisk;
  const absenteeism = analyticsData?.absenteeismModel;
  const recruitment = analyticsData?.recruitmentBottlenecks;

  // Filtered Attrition Employees
  const filteredEmployees = useMemo(() => {
    if (!attrition?.allScoredEmployees) return [];
    return attrition.allScoredEmployees.filter((emp) => {
      const matchesSearch =
        !attritionSearch.trim() ||
        emp.full_name?.toLowerCase().includes(attritionSearch.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(attritionSearch.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(attritionSearch.toLowerCase());

      const matchesDept =
        attritionDeptFilter === "All" || emp.dept === attritionDeptFilter;

      const matchesRisk =
        attritionRiskFilter === "All" || emp.riskLevel === attritionRiskFilter;

      return matchesSearch && matchesDept && matchesRisk;
    });
  }, [attrition, attritionSearch, attritionDeptFilter, attritionRiskFilter]);

  // Distinct departments for filter
  const departmentsList = useMemo(() => {
    if (!attrition?.departmentSummary) return ["All"];
    return ["All", ...attrition.departmentSummary.map((d) => d.department)];
  }, [attrition]);

  return (
    <div className="min-h-screen max-w-7xl mx-auto bg-slate-50/70 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <LuBrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                  Predictive & Advanced HR Analytics
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <LuSparkles className="w-3 h-3 text-purple-600" />
                  Forecasting Engine
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Machine learning-inspired models for attrition risk, predictive absenteeism patterns, and recruitment pipeline bottlenecks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 rounded-lg border border-slate-300 shadow-xs transition-colors"
            >
              <LuRefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? "animate-spin" : ""}`} />
              Re-run Forecasts
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 mt-6 -mb-5 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("attrition")}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === "attrition"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <LuUserX className="w-4 h-4" />
            Attrition Risk Modeling (Flight Risk)
            {attrition?.highRiskCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                {attrition.highRiskCount} High Risk
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("absenteeism")}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === "absenteeism"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <LuCalendar className="w-4 h-4" />
            Predictive Absenteeism & Sandwich Patterns
          </button>

          <button
            onClick={() => setActiveTab("recruitment")}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === "recruitment"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <LuLayers className="w-4 h-4" />
            Recruitment Pipeline Bottlenecks
            {recruitment?.primaryBottleneckStage && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                Bottleneck Flagged
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <LuBrainCircuit className="w-10 h-10 animate-pulse text-indigo-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            Running Predictive Risk & Funnel Analytics...
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Aggregating historical attendance patterns, cross-referencing tenure inflection curves, and benchmarking recruitment stage SLAs.
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* TAB 1: ATTRITION RISK ANALYSIS */}
          {/* ========================================================= */}
          {activeTab === "attrition" && (
            <div className="space-y-6">
              {/* Attrition Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Org Flight Risk Score
                    </span>
                    <div className="text-2xl font-bold text-slate-800 mt-1 flex items-baseline gap-2">
                      <span>{attrition?.overallScore || 0}</span>
                      <span className="text-xs text-slate-400 font-normal">/ 100</span>
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 mt-2 rounded text-[11px] font-bold ${(attrition?.overallScore || 0) >= 55
                          ? "bg-rose-100 text-rose-700"
                          : (attrition?.overallScore || 0) >= 35
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                    >
                      {(attrition?.overallScore || 0) >= 55
                        ? "Elevated Turnover Risk"
                        : (attrition?.overallScore || 0) >= 35
                          ? "Moderate Watchlist"
                          : "Healthy Talent Stability"}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <LuFlame className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      High Flight Risk Staff
                    </span>
                    <div className="text-2xl font-bold text-rose-600 mt-1">
                      {attrition?.highRiskCount || 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Immediate retention action needed
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <LuTriangleAlert className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Medium Watchlist Staff
                    </span>
                    <div className="text-2xl font-bold text-amber-600 mt-1">
                      {attrition?.mediumRiskCount || 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Monitor for disengagement
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <LuActivity className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Low Risk & Engaged
                    </span>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                      {attrition?.lowRiskCount || 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {attrition?.totalEvaluated || 0} Total Active Staff
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <LuUserCheck className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Department Attrition Vulnerability Cards */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <LuBuilding2 className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      Department-Wise Flight Risk Vulnerability
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Calculated from tenure, punch trends & leave velocity
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {attrition?.departmentSummary?.map((d) => (
                    <div
                      key={d.department}
                      className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-slate-800">
                            {d.department}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.avgRiskScore >= 55
                                ? "bg-rose-100 text-rose-700"
                                : d.avgRiskScore >= 35
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                          >
                            {d.status}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between mb-1 text-xs">
                          <span className="text-slate-500">Avg Risk Score</span>
                          <span className="font-bold text-slate-800">{d.avgRiskScore}/100</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-3">
                          <div
                            className={`h-full rounded-full ${d.avgRiskScore >= 55
                                ? "bg-rose-500"
                                : d.avgRiskScore >= 35
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                            style={{ width: `${Math.min(100, d.avgRiskScore)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200/80 text-center text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">Total</div>
                          <div className="font-bold text-slate-700">{d.headcount}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-rose-500 font-semibold">High</div>
                          <div className="font-bold text-rose-600">{d.highRiskCount}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-amber-500 font-semibold">Watch</div>
                          <div className="font-bold text-amber-600">{d.mediumRiskCount}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* High Flight Risk Watchlist Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <LuShieldAlert className="w-5 h-5 text-rose-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Employee Flight Risk Watchlist ({filteredEmployees.length} Staff)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Ranked by multi-factor disengagement algorithms with prescriptive retention guidance.
                      </p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <LuSearch className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search employee or role..."
                        value={attritionSearch}
                        onChange={(e) => setAttritionSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white w-40 md:w-56"
                      />
                    </div>

                    <select
                      value={attritionDeptFilter}
                      onChange={(e) => setAttritionDeptFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none"
                    >
                      {departmentsList.map((d) => (
                        <option key={d} value={d}>
                          Dept: {d}
                        </option>
                      ))}
                    </select>

                    <select
                      value={attritionRiskFilter}
                      onChange={(e) => setAttritionRiskFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none"
                    >
                      <option value="All">All Risk Levels</option>
                      <option value="High">High Risk Only</option>
                      <option value="Medium">Medium Watchlist</option>
                      <option value="Low">Low / Stable</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
                      <tr>
                        <th className="py-3 px-3.5">Employee</th>
                        <th className="py-3 px-3.5">Department & Role</th>
                        <th className="py-3 px-3.5">Tenure</th>
                        <th className="py-3 px-3.5">Risk Score</th>
                        <th className="py-3 px-3.5">Key Identified Risk Drivers</th>
                        <th className="py-3 px-3.5">Recommended Retention Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            No employees match your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <div className="font-bold text-slate-800">{emp.full_name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {emp.employee_id}
                              </div>
                            </td>

                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <div className="font-medium text-slate-700">{emp.dept}</div>
                              <div className="text-[11px] text-slate-400">{emp.designation}</div>
                            </td>

                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="font-semibold text-slate-700">
                                {(emp.tenureMonths / 12).toFixed(1)} yrs
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({emp.tenureMonths} mos)
                              </span>
                            </td>

                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${emp.riskLevel === "High"
                                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                                      : emp.riskLevel === "Medium"
                                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    }`}
                                >
                                  {emp.riskScore}/100 • {emp.riskLevel}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3.5">
                              <div className="flex flex-wrap gap-1 max-w-sm">
                                {emp.riskFactors?.length > 0 ? (
                                  emp.riskFactors.map((f, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                                      title={f.detail}
                                    >
                                      {f.factor}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">
                                    Standard engagement metrics
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3.5">
                              <div className="text-xs text-slate-700 font-medium max-w-xs flex items-start gap-1.5">
                                <LuSparkles className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                                <span>{emp.recommendedAction}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: PREDICTIVE ABSENTEEISM MODELING */}
          {/* ========================================================= */}
          {activeTab === "absenteeism" && (
            <div className="space-y-6">
              {/* Absenteeism KPI Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Historical Absence Rate
                    </span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">
                      {absenteeism?.historicalRate}%
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Based on past 90 days punches
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <LuClock className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Forecasted Rate (Next 30D)
                    </span>
                    <div className="text-2xl font-bold text-indigo-600 mt-1">
                      {absenteeism?.projectedRateNext30Days}%
                    </div>
                    <span className="text-[11px] text-indigo-500 font-semibold mt-1 block">
                      +0.5% Seasonal Adjustment
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <LuTrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Projected Unplanned Absences
                    </span>
                    <div className="text-2xl font-bold text-amber-600 mt-1">
                      {absenteeism?.projectedUnplannedAbsences} Days
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Expected across all departments
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <LuCalendar className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Estimated Productive Hours Lost
                    </span>
                    <div className="text-2xl font-bold text-rose-600 mt-1">
                      ~{absenteeism?.projectedProductiveHoursLost} Hours
                    </div>
                    <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                      Productivity Buffer Risk
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <LuTriangleAlert className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Day-of-Week Pattern & Sandwich Detector */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Day of Week Visual Breakdown */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <LuActivity className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Day-of-Week Absence Distribution & Spike Patterns
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400">Past 90 Days Trend</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {absenteeism?.dayOfWeekPatterns?.map((item) => (
                      <div
                        key={item.day}
                        className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${item.isSpike
                            ? "bg-rose-50/50 border-rose-200 shadow-xs"
                            : "bg-slate-50/50 border-slate-200"
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-800">{item.day}</span>
                            {item.isSpike && (
                              <span className="w-2 h-2 rounded-full bg-rose-500" title="Spike Day" />
                            )}
                          </div>
                          <div className="text-lg font-bold text-slate-800">
                            {item.absenceRate}%
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {item.absentCount} of {item.totalScheduled} absent
                          </span>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200/60">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${item.isSpike ? "text-rose-600" : "text-emerald-600"
                              }`}
                          >
                            {item.isSpike ? "High Risk Spike" : "Baseline Stability"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                    <LuInfo className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Sandwich Pattern Detected: </span>
                      <span>
                        Mondays and Fridays exhibit an absence rate of up to 45% above midweek norms, signaling frequent weekend sandwich leave clustering.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sandwich Leave Detector & Policy Recommendations */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <LuShieldAlert className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Sandwich Leave Vulnerability
                      </h3>
                    </div>

                    <div className="py-4 text-center">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-indigo-500 bg-indigo-50/50 text-indigo-700 font-extrabold text-2xl shadow-inner">
                        {absenteeism?.sandwichVulnerabilityPct}%
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-2">
                        Weekend Adjacent Clustering Index
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Share of total unplanned absences falling on Monday or Friday
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Strategic Policy Interventions
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {absenteeism?.insights?.map((ins, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-indigo-600 font-bold">•</span>
                            <span>{ins}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: RECRUITMENT PIPELINE BOTTLENECKS */}
          {/* ========================================================= */}
          {activeTab === "recruitment" && (
            <div className="space-y-6">
              {/* Bottleneck Spotlight Card */}
              <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 rounded-2xl border border-amber-200 p-5 md:p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                      <LuTriangleAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                        Primary Recruitment Bottleneck Identified
                      </span>
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 mt-0.5">
                        {recruitment?.primaryBottleneckStage}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Turnaround cycle exceeds target benchmark by{" "}
                        <span className="font-bold text-rose-600">
                          +{recruitment?.bottleneckDelayDays} days
                        </span>
                        . High candidate drop-off observed during interviewer evaluation.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-amber-200/60 shadow-xs">
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Avg Time to Hire</div>
                      <div className="text-lg font-bold text-slate-800">
                        {recruitment?.overallTimeToHireDays} <span className="text-xs font-normal">days</span>
                      </div>
                    </div>
                    <div className="border-l border-slate-200 pl-4">
                      <div className="text-[11px] text-slate-400 font-medium">SLA Benchmark</div>
                      <div className="text-lg font-bold text-emerald-600">
                        {recruitment?.benchmarkTimeToHireDays} <span className="text-xs font-normal">days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Recruitment Funnel Stages */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <LuLayers className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      Recruitment Velocity & Stage-by-Stage Funnel
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {recruitment?.totalOpenRequisitions} Active Requisitions Tracked
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  {recruitment?.funnelStages?.map((stage, idx) => {
                    const isBottleneck = stage.status === "Critical Bottleneck";
                    const isDelay = stage.status === "Moderate Delay";

                    return (
                      <div
                        key={stage.key}
                        className={`rounded-xl border p-4 flex flex-col justify-between transition-all relative ${isBottleneck
                            ? "bg-rose-50/50 border-rose-300 shadow-xs ring-1 ring-rose-200"
                            : isDelay
                              ? "bg-amber-50/40 border-amber-200"
                              : "bg-slate-50/40 border-slate-200"
                          }`}
                      >
                        {/* Step Index Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isBottleneck
                                ? "bg-rose-100 text-rose-700"
                                : isDelay
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                          >
                            {stage.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-800 leading-tight">
                            {stage.label}
                          </h4>
                          <div className="text-xl font-extrabold text-slate-800 mt-2">
                            {stage.totalCandidates}
                            <span className="text-xs font-normal text-slate-400 ml-1">
                              candidates
                            </span>
                          </div>
                        </div>

                        {/* Velocity & SLA Comparison */}
                        <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Actual Velocity:</span>
                            <span
                              className={`font-bold ${stage.actualAvgDays > stage.slaBenchmarkDays
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                                }`}
                            >
                              {stage.actualAvgDays} days
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Target SLA:</span>
                            <span className="font-semibold text-slate-600">
                              {stage.slaBenchmarkDays} days
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/40">
                            <span className="text-slate-400">Conversion:</span>
                            <span className="font-bold text-indigo-600">
                              {stage.conversionRate}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Diagnostic Recommendations */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <LuSparkles className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Pipeline Velocity Diagnostics & Remediation Plan
                  </h3>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  {recruitment?.diagnosticRecommendations?.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5"
                    >
                      <LuCircleCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
