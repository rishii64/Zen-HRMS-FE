import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button, Table, Badge, Spinner, Form, Modal, ProgressBar } from "react-bootstrap";
import toast from "react-hot-toast";
import {
  LuCalendar,
  LuRefreshCw,
  LuSearch,
  LuFilter,
  LuUserCheck,
  LuUsers,
  LuHistory,
  LuShieldCheck,
  LuCircleAlert,
  LuPlus,
  LuClock,
  LuChevronRight,
  LuDownload,
  LuInfo,
  LuSparkles,
  LuFileText
} from "react-icons/lu";
import { getApiBaseUrl } from "../../../api/axios";

const API = getApiBaseUrl();

export default function LeaveAllocationDesk({ token, employees: initialEmployees = [], onAllocationChanged }) {
  const [employees, setEmployees] = useState(initialEmployees || []);

  useEffect(() => {
    if (initialEmployees && initialEmployees.length > 0) {
      setEmployees(initialEmployees);
    } else {
      fetch(`${API}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          const list = data.data || data.employees || [];
          if (Array.isArray(list) && list.length > 0) {
            setEmployees(list);
          }
        })
        .catch((err) => console.error("Error fetching employees in LeaveAllocationDesk:", err));
    }
  }, [initialEmployees, token]);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  // Modal States
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form State: Individual Allocation
  const [individualForm, setIndividualForm] = useState({
    employee_id: "",
    name: "",
    dept: "",
    cl_quota: 5,
    sl_quota: 5,
    el_quota: 12,
    el_carried: 0,
    pl_quota: 15,
    pl_carried: 0,
    ml_quota: 90,
    pat_quota: 5,
    notes: ""
  });
  const [individualSaving, setIndividualSaving] = useState(false);

  // Form State: Bulk Allocation
  const [bulkForm, setBulkForm] = useState({
    target_type: "ALL", // "ALL" | "DEPARTMENT" | "EMPLOYMENT_TYPE" | "SPECIFIC_EMPLOYEES"
    target_value: "",
    cl_quota: 5,
    sl_quota: 5,
    el_quota: 12,
    pl_quota: 15,
    include_ml: false, // Default to FALSE to prevent allocating 90 days ML to all
    ml_quota: 90,
    ml_target: "FEMALE_ONLY", // "FEMALE_ONLY" | "ALL"
    include_pat: false,
    pat_quota: 5,
    pat_target: "MALE_ONLY", // "MALE_ONLY" | "ALL"
    preserve_carried_forward: true,
    selected_emp_ids: [],
    notes: "Annual Quota Allocation"
  });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [cleaningUpGender, setCleaningUpGender] = useState(false);

  // Form State: Carry Forward Roll-Over
  const [cfForm, setCfForm] = useState({
    from_year: new Date().getFullYear() - 1,
    to_year: new Date().getFullYear(),
    target_type: "ALL",
    target_value: ""
  });
  const [cfProcessing, setCfProcessing] = useState(false);
  const [cfResultSummary, setCfResultSummary] = useState(null);

  // Fetch Allocations
  const fetchAllocations = async () => {
    setLoading(true);
    try {
      let url = `${API}/leave/allocations?year=${selectedYear}`;
      if (selectedDept !== "All") url += `&dept=${encodeURIComponent(selectedDept)}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAllocations(data.data);
      } else {
        toast.error(data.error || "Failed to load allocations");
      }
    } catch (err) {
      console.error("Fetch allocations error:", err);
      toast.error("Error loading leave allocations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [selectedYear, selectedDept]);

  // Handle Search Input (debounced / on submit)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAllocations();
  };

  // Open Individual Allocation Modal for a selected employee
  const handleOpenIndividual = (emp) => {
    if (emp) {
      const getCat = (code) => emp.categories?.find(c => c.leave_code === code) || {};
      const elCat = getCat("EL");
      const plCat = getCat("PL");
      const clCat = getCat("CL");
      const slCat = getCat("SL");
      const mlCat = getCat("ML");
      const patCat = getCat("PAT");
      const isFem = (emp.gender || "").toLowerCase().startsWith("f");
      const isM = (emp.gender || "").toLowerCase().startsWith("m");

      setIndividualForm({
        employee_id: emp.employee_id,
        name: emp.name,
        dept: emp.dept,
        cl_quota: clCat.allocated_days ?? 5,
        sl_quota: slCat.allocated_days ?? 5,
        el_quota: elCat.allocated_days ?? 12,
        el_carried: elCat.carried_forward ?? 0,
        pl_quota: plCat.allocated_days ?? 15,
        pl_carried: plCat.carried_forward ?? 0,
        ml_quota: mlCat.allocated_days ?? (isFem ? 90 : 0),
        pat_quota: patCat.allocated_days ?? (isM ? 5 : 0),
        notes: ""
      });
    } else {
      // Pick first employee or blank
      const firstEmp = employees[0] || {};
      const isFirstFem = (firstEmp.gender || "").toLowerCase().startsWith("f");
      setIndividualForm({
        employee_id: firstEmp.employee_code || firstEmp.employee_id || "",
        name: firstEmp.name || "",
        dept: firstEmp.dept || firstEmp.department || "General",
        cl_quota: 5,
        sl_quota: 5,
        el_quota: 12,
        el_carried: 0,
        pl_quota: 15,
        pl_carried: 0,
        ml_quota: isFirstFem ? 90 : 0,
        pat_quota: isFirstFem ? 0 : 5,
        notes: ""
      });
    }
    setShowIndividualModal(true);
  };

  // Submit Individual Allocation Form
  const handleSubmitIndividual = async (e) => {
    e.preventDefault();
    setIndividualSaving(true);

    try {
      // Validate carry forward cap of 45
      if (parseFloat(individualForm.el_carried || 0) > 45) {
        toast.error("Earned Leave carry-forward cannot exceed 45 leaves (3-year maximum stacking limit).");
        setIndividualSaving(false);
        return;
      }
      if (parseFloat(individualForm.pl_carried || 0) > 45) {
        toast.error("Privilege Leave carry-forward cannot exceed 45 leaves (3-year maximum stacking limit).");
        setIndividualSaving(false);
        return;
      }

      const payload = {
        employee_id: individualForm.employee_id,
        year: selectedYear,
        allocations: [
          { leave_code: "CL", allocated_days: individualForm.cl_quota, carried_forward: 0 },
          { leave_code: "SL", allocated_days: individualForm.sl_quota, carried_forward: 0 },
          { leave_code: "EL", allocated_days: individualForm.el_quota, carried_forward: individualForm.el_carried },
          { leave_code: "PL", allocated_days: individualForm.pl_quota, carried_forward: individualForm.pl_carried },
          { leave_code: "ML", allocated_days: individualForm.ml_quota, carried_forward: 0 },
          { leave_code: "PAT", allocated_days: individualForm.pat_quota, carried_forward: 0 }
        ],
        notes: individualForm.notes
      };

      const res = await fetch(`${API}/leave/allocate/individual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Leave allocation updated for ${individualForm.name || individualForm.employee_id}`);
        setShowIndividualModal(false);
        fetchAllocations();
        if (onAllocationChanged) onAllocationChanged();
      } else {
        toast.error(data.error || "Failed to update allocation");
      }
    } catch (err) {
      console.error("Submit individual allocation error:", err);
      toast.error("Error saving individual allocation");
    } finally {
      setIndividualSaving(false);
    }
  };

  // Submit Bulk Allocation Form
  const handleSubmitBulk = async (e) => {
    e.preventDefault();
    setBulkSaving(true);

    try {
      const quotasToSubmit = [
        { leave_code: "CL", allocated_days: parseFloat(bulkForm.cl_quota) || 5 },
        { leave_code: "SL", allocated_days: parseFloat(bulkForm.sl_quota) || 5 },
        { leave_code: "EL", allocated_days: parseFloat(bulkForm.el_quota) || 12 },
        { leave_code: "PL", allocated_days: parseFloat(bulkForm.pl_quota) || 15 },
      ];

      // Only include Maternity Leave if explicitly checked by HR
      if (bulkForm.include_ml) {
        quotasToSubmit.push({
          leave_code: "ML",
          allocated_days: parseFloat(bulkForm.ml_quota) || 90,
          target_gender: bulkForm.ml_target || "FEMALE_ONLY"
        });
      }

      // Only include Paternity Leave if explicitly checked by HR
      if (bulkForm.include_pat) {
        quotasToSubmit.push({
          leave_code: "PAT",
          allocated_days: parseFloat(bulkForm.pat_quota) || 5,
          target_gender: bulkForm.pat_target || "MALE_ONLY"
        });
      }

      const payload = {
        target_type: bulkForm.target_type,
        target_value: bulkForm.target_type === "SPECIFIC_EMPLOYEES"
          ? bulkForm.selected_emp_ids
          : bulkForm.target_value,
        year: selectedYear,
        quotas: quotasToSubmit,
        preserve_carried_forward: bulkForm.preserve_carried_forward,
        notes: bulkForm.notes
      };

      const res = await fetch(`${API}/leave/allocate/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Allocated leaves successfully to ${data.count} employees!`);
        setShowBulkModal(false);
        fetchAllocations();
        if (onAllocationChanged) onAllocationChanged();
      } else {
        toast.error(data.error || "Bulk allocation failed");
      }
    } catch (err) {
      console.error("Bulk allocation error:", err);
      toast.error("Error processing bulk allocation");
    } finally {
      setBulkSaving(false);
    }
  };

  // One-Click Audit & Cleanup Gender Allocations
  const handleCleanupGender = async () => {
    if (!window.confirm(`Audit & Clean Up Gender Leaves for Year ${selectedYear}?\n\nThis will reset any 90-day Maternity Leave erroneously allocated to male staff and any Paternity Leave assigned to female staff to 0.`)) {
      return;
    }
    setCleaningUpGender(true);
    try {
      const res = await fetch(`${API}/leave/cleanup-gender-allocations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ year: selectedYear })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Cleaned up ${data.cleanedCount} gender leave records.`);
        fetchAllocations();
        if (onAllocationChanged) onAllocationChanged();
      } else {
        toast.error(data.error || "Cleanup failed");
      }
    } catch (err) {
      console.error("Cleanup gender allocations error:", err);
      toast.error("Error running gender allocations cleanup");
    } finally {
      setCleaningUpGender(false);
    }
  };

  // Submit Year-End Carry Forward Roll-Over
  const handleProcessCarryForward = async (e) => {
    e.preventDefault();
    setCfProcessing(true);
    setCfResultSummary(null);

    try {
      const payload = {
        from_year: parseInt(cfForm.from_year, 10),
        to_year: parseInt(cfForm.to_year, 10),
        target_type: cfForm.target_type,
        target_value: cfForm.target_value
      };

      const res = await fetch(`${API}/leave/process-carry-forward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Carry-forward roll-over completed successfully!");
        setCfResultSummary(data);
        fetchAllocations();
        if (onAllocationChanged) onAllocationChanged();
      } else {
        toast.error(data.error || "Carry forward processing failed");
      }
    } catch (err) {
      console.error("Carry forward error:", err);
      toast.error("Error processing carry forward");
    } finally {
      setCfProcessing(false);
    }
  };

  // View 3-Year Carry Forward History
  const handleViewHistory = async (emp) => {
    setSelectedEmployeeForHistory(emp);
    setShowHistoryModal(true);
    setHistoryLoading(true);

    try {
      const res = await fetch(`${API}/leave/carry-forward-history/${emp.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setHistoryLogs(data.data);
      } else {
        setHistoryLogs([]);
      }
    } catch (err) {
      console.error("History fetch error:", err);
      toast.error("Failed to load carry forward history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Unique departments for filter
  const departmentsList = Array.from(new Set((employees || []).map(e => e.dept || e.department || "General").filter(Boolean)));

  // Aggregate Counters
  const totalEmployees = allocations.length;
  const totalCarriedForwardAll = allocations.reduce((acc, curr) => acc + (curr.summary?.total_carried_forward || 0), 0);
  const totalLapsedAll = allocations.reduce((acc, curr) => acc + (curr.summary?.total_lapsed || 0), 0);
  const totalAllocatedAll = allocations.reduce((acc, curr) => acc + (curr.summary?.total_allocated || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. RULE BANNER & COMPLIANCE HEADER */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-800/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30 mb-2">
              <LuShieldCheck className="w-3.5 h-3.5" /> Statutory Leave Policy Engine • Active
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mb-1">
              Leave Quotas & Carry-Forward Engine
            </h2>
            <p className="text-xs text-indigo-200/90 max-w-3xl leading-relaxed">
              HR sets leave entitlements individually or in groups. <strong>Only Earned Leaves (EL) &amp; Privilege Leaves (PL)</strong> can be carry-forwarded up to <strong>3 years</strong> (stacking up to a maximum cap of <strong>45 leaves</strong>). Any balance beyond 45 or older than 3 years will automatically lapse. Casual (CL) &amp; Sick (SL) leaves reset annually.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenIndividual(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-indigo-50 transition-all shadow-sm cursor-pointer"
            >
              <LuUserCheck className="w-4 h-4 text-indigo-600" /> Set Individual Quota
            </button>

            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer border border-indigo-400/30"
            >
              <LuUsers className="w-4 h-4 text-indigo-200" /> Group / Bulk Allocate
            </button>

            <button
              onClick={() => setShowCarryForwardModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-sm cursor-pointer"
            >
              <LuRefreshCw className="w-4 h-4" /> Run Carry-Forward &amp; Lapse
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-indigo-800/80">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] font-medium text-indigo-200">Total Staff Allocated</div>
            <div className="text-xl font-black text-white mt-0.5">{totalEmployees}</div>
            <div className="text-[10px] text-indigo-300/80">Active in Year {selectedYear}</div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] font-medium text-indigo-200">Total Leaves Allocated</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{totalAllocatedAll} <span className="text-xs font-semibold text-emerald-200/80">Days</span></div>
            <div className="text-[10px] text-indigo-300/80">Fresh annual quotas</div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] font-medium text-indigo-200">Carried Forward (EL+PL)</div>
            <div className="text-xl font-black text-blue-400 mt-0.5">{totalCarriedForwardAll} <span className="text-xs font-semibold text-blue-200/80">Days</span></div>
            <div className="text-[10px] text-indigo-300/80">Stacked (Cap: 45 / Max 3 Yrs)</div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-[11px] font-medium text-indigo-200">Total Leaves Lapsed</div>
            <div className="text-xl font-black text-rose-400 mt-0.5">{totalLapsedAll} <span className="text-xs font-semibold text-rose-200/80">Days</span></div>
            <div className="text-[10px] text-indigo-300/80">&gt;45 Cap / &gt;3 Yrs Expiry</div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & CONTROLS TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Allocation Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y} {y === new Date().getFullYear() ? "(Current)" : ""}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none"
            >
              <option value="All">All Departments</option>
              {departmentsList.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-64 md:w-80">
          <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search employee name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </form>
      </div>

      {/* 3. ALLOCATIONS MASTER TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-0.5">Employee Allocations &amp; Carry-Forward Ledger</h3>
            <p className="text-[11px] text-slate-400 mb-0">Live balances, carry-forward quotas, and lapse audit log for Year {selectedYear}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCleanupGender}
              disabled={cleaningUpGender}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-700 hover:text-pink-800 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              title="Reset 90-day ML from male staff and PAT from female staff"
            >
              <LuShieldCheck className="w-3.5 h-3.5 text-pink-600" />
              {cleaningUpGender ? "Auditing Leaves..." : "Audit Gender Leaves (Fix ML for Males)"}
            </button>
            <button
              onClick={fetchAllocations}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-all"
            >
              <LuRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Spinner animation="border" variant="primary" className="mb-2" />
            <div className="text-xs font-semibold">Loading allocations &amp; carry-forward records...</div>
          </div>
        ) : allocations.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <LuCircleAlert className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <div className="text-sm font-bold text-slate-700">No Allocation Records Found</div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Use &quot;Set Individual Quota&quot; or &quot;Group / Bulk Allocate&quot; to assign leave quotas for {selectedYear}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table hover responsive className="mb-0 align-middle">
              <thead className="bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-3 text-center">Casual (CL)</th>
                  <th className="py-3.5 px-3 text-center">Sick (SL)</th>
                  <th className="py-3.5 px-3 text-center">
                    <span className="text-purple-700">Earned (EL)</span>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">CF Max 3 Yrs (Cap 45)</span>
                  </th>
                  <th className="py-3.5 px-3 text-center">
                    <span className="text-indigo-700">Privilege (PL)</span>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">CF Max 3 Yrs (Cap 45)</span>
                  </th>
                  <th className="py-3.5 px-3 text-center">
                    <span className="text-pink-700">Parental</span>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">ML (F) / PAT (M)</span>
                  </th>
                  <th className="py-3.5 px-3 text-center">Stacked CF (EL+PL)</th>
                  <th className="py-3.5 px-3 text-center">Lapsed</th>
                  <th className="py-3.5 px-3 text-center">Available Bal</th>
                  <th className="py-3.5 px-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {allocations.map((emp) => {
                  const getC = (code) => emp.categories?.find(c => c.leave_code === code) || {};
                  const cl = getC("CL");
                  const sl = getC("SL");
                  const el = getC("EL");
                  const pl = getC("PL");
                  const ml = getC("ML");
                  const pat = getC("PAT");
                  const isFem = (emp.gender || "").toLowerCase().startsWith("f");
                  const stackedCF = (el.carried_forward || 0) + (pl.carried_forward || 0);
                  const totalLapsed = (el.lapsed_days || 0) + (pl.lapsed_days || 0);

                  return (
                    <tr key={emp.employee_id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Employee details */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{emp.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          <span className="font-mono text-slate-700">{emp.employee_id}</span> • {emp.dept}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                            emp.employment_type?.toLowerCase() === "permanent"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {emp.employment_type || "Permanent"}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isFem ? "bg-pink-100 text-pink-700" : "bg-sky-100 text-sky-700"
                          }`}>
                            {emp.gender || (isFem ? "Female" : "Male")}
                          </span>
                        </div>
                      </td>

                      {/* Casual Leave */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800">{cl.allocated_days ?? 5} <span className="text-[10px] text-slate-400">alloc</span></div>
                        <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                          Bal: {cl.balance ?? 5}
                        </div>
                      </td>

                      {/* Sick Leave */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800">{sl.allocated_days ?? 5} <span className="text-[10px] text-slate-400">alloc</span></div>
                        <div className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                          Bal: {sl.balance ?? 5}
                        </div>
                      </td>

                      {/* Earned Leave (EL) with Carry Forward */}
                      <td className="py-3 px-3 text-center bg-purple-50/30">
                        <div className="font-extrabold text-purple-900">
                          {el.allocated_days ?? 12}
                          {el.carried_forward > 0 && (
                            <span className="text-emerald-700 font-black ml-1 text-[11px]" title="Carried forward from previous years">
                              +{el.carried_forward} CF
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          Bal: {el.balance ?? 12}
                        </div>
                      </td>

                      {/* Privilege Leave (PL) with Carry Forward */}
                      <td className="py-3 px-3 text-center bg-indigo-50/30">
                        <div className="font-extrabold text-indigo-900">
                          {pl.allocated_days ?? 15}
                          {pl.carried_forward > 0 && (
                            <span className="text-emerald-700 font-black ml-1 text-[11px]" title="Carried forward from previous years">
                              +{pl.carried_forward} CF
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          Bal: {pl.balance ?? 15}
                        </div>
                      </td>

                      {/* Parental: ML (Female) or PAT (Male) */}
                      <td className="py-3 px-3 text-center">
                        {isFem ? (
                          <div>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                              ML: {ml.allocated_days ?? 90}d
                            </span>
                            <div className="text-[9px] text-slate-400 mt-0.5 font-medium">Bal: {ml.balance ?? 90}d</div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                              PAT: {pat.allocated_days ?? 5}d
                            </span>
                            <div className="text-[9px] text-slate-400 mt-0.5 font-medium">Bal: {pat.balance ?? 5}d</div>
                          </div>
                        )}
                      </td>

                      {/* Stacked Carry Forward */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-black text-slate-900">
                          {stackedCF} <span className="text-[10px] text-slate-400 font-normal">/ 45</span>
                        </div>
                        <ProgressBar
                          now={Math.min(100, (stackedCF / 45) * 100)}
                          variant={stackedCF >= 40 ? "danger" : stackedCF >= 25 ? "warning" : "info"}
                          className="h-1.5 rounded-full mt-1 max-w-[80px] mx-auto"
                        />
                      </td>

                      {/* Lapsed */}
                      <td className="py-3 px-3 text-center">
                        {totalLapsed > 0 ? (
                          <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            ⚠️ {totalLapsed} d
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">—</span>
                        )}
                      </td>

                      {/* Total Available Balance */}
                      <td className="py-3 px-3 text-center">
                        <div className="text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl inline-block shadow-2xs">
                          {emp.summary?.total_balance ?? 0} d
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenIndividual(emp)}
                            className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Set Individual Quotas & Opening Balances"
                          >
                            Set Quotas
                          </button>

                          <button
                            onClick={() => handleViewHistory(emp)}
                            className="p-1.5 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                            title="View 3-Year Carry Forward Audit Ledger"
                          >
                            <LuHistory className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: SET INDIVIDUAL LEAVE QUOTA & CARRY-FORWARD       */}
      {/* ======================================================== */}
      <Modal show={showIndividualModal} onHide={() => setShowIndividualModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <LuUserCheck className="text-indigo-600" /> Set Individual Leave Quotas &amp; Carry-Forward ({selectedYear})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form onSubmit={handleSubmitIndividual} className="space-y-4">
            {/* Employee Selection */}
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="text-xs font-bold text-slate-700">Select Employee</Form.Label>
                  <Form.Select
                    value={individualForm.employee_id}
                    onChange={(e) => {
                      const emp = employees.find(x => (x.employee_code || x.employee_id) === e.target.value);
                      if (emp) {
                        const isFem = (emp.gender || "").toLowerCase().startsWith("f");
                        setIndividualForm(prev => ({
                          ...prev,
                          employee_id: emp.employee_code || emp.employee_id,
                          name: emp.name || "",
                          dept: emp.dept || emp.department || "General",
                          ml_quota: isFem ? 90 : 0,
                          pat_quota: isFem ? 0 : 5
                        }));
                      }
                    }}
                    required
                    className="text-xs rounded-xl"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map(e => (
                      <option key={e.employee_code || e.employee_id} value={e.employee_code || e.employee_id}>
                        {e.name} ({e.employee_code || e.employee_id}) — {e.dept || e.department}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="text-xs font-bold text-slate-700">Department</Form.Label>
                  <Form.Control
                    type="text"
                    value={individualForm.dept}
                    disabled
                    className="text-xs rounded-xl bg-slate-100"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Carry-Forward Statutory Notice */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 text-xs text-indigo-900">
              <div className="font-extrabold flex items-center gap-1.5 mb-1 text-indigo-950">
                <LuInfo className="w-4 h-4 text-indigo-600" /> Stacking Cap &amp; Carry-Forward Rule
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-indigo-800">
                <li><strong>Only Earned Leaves (EL) &amp; Privilege Leaves (PL)</strong> can be carry-forwarded.</li>
                <li>Stacking limit: Maximum <strong>45 leaves</strong> across up to <strong>3 years</strong>.</li>
                <li>Casual Leave (CL) &amp; Sick Leave (SL) cannot be carried forward (annual quota only).</li>
              </ul>
            </div>

            {/* Quota Inputs Grid */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
              <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">Leave Category Quotas</div>

              <Row className="g-3">
                {/* Earned Leave (EL) */}
                <Col md={6}>
                  <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3">
                    <div className="text-xs font-extrabold text-purple-950 mb-2 flex items-center justify-between">
                      <span>Earned Leave (EL)</span>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">Carry-Forward Enabled</span>
                    </div>
                    <Row className="g-2">
                      <Col xs={6}>
                        <Form.Label className="text-[11px] font-bold text-slate-600">Fresh Annual Quota</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.5"
                          min="0"
                          value={individualForm.el_quota}
                          onChange={(e) => setIndividualForm({ ...individualForm, el_quota: parseFloat(e.target.value) || 0 })}
                          required
                          className="text-xs rounded-lg"
                        />
                      </Col>
                      <Col xs={6}>
                        <Form.Label className="text-[11px] font-bold text-slate-600">Opening Carried Forward</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.5"
                          min="0"
                          max="45"
                          value={individualForm.el_carried}
                          onChange={(e) => setIndividualForm({ ...individualForm, el_carried: parseFloat(e.target.value) || 0 })}
                          className="text-xs rounded-lg"
                        />
                        <span className="text-[9px] text-slate-400">Max 45 leaves cap</span>
                      </Col>
                    </Row>
                  </div>
                </Col>

                {/* Privilege Leave (PL) */}
                <Col md={6}>
                  <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3">
                    <div className="text-xs font-extrabold text-indigo-950 mb-2 flex items-center justify-between">
                      <span>Privilege Leave (PL)</span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">Carry-Forward Enabled</span>
                    </div>
                    <Row className="g-2">
                      <Col xs={6}>
                        <Form.Label className="text-[11px] font-bold text-slate-600">Fresh Annual Quota</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.5"
                          min="0"
                          value={individualForm.pl_quota}
                          onChange={(e) => setIndividualForm({ ...individualForm, pl_quota: parseFloat(e.target.value) || 0 })}
                          required
                          className="text-xs rounded-lg"
                        />
                      </Col>
                      <Col xs={6}>
                        <Form.Label className="text-[11px] font-bold text-slate-600">Opening Carried Forward</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.5"
                          min="0"
                          max="45"
                          value={individualForm.pl_carried}
                          onChange={(e) => setIndividualForm({ ...individualForm, pl_carried: parseFloat(e.target.value) || 0 })}
                          className="text-xs rounded-lg"
                        />
                        <span className="text-[9px] text-slate-400">Max 45 leaves cap</span>
                      </Col>
                    </Row>
                  </div>
                </Col>

                {/* Casual Leave */}
                <Col sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="text-[11px] font-bold text-slate-700">Casual Leave (CL)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.5"
                      min="0"
                      value={individualForm.cl_quota}
                      onChange={(e) => setIndividualForm({ ...individualForm, cl_quota: parseFloat(e.target.value) || 0 })}
                      required
                      className="text-xs rounded-lg"
                    />
                    <span className="text-[9px] text-slate-400">No carry-forward</span>
                  </Form.Group>
                </Col>

                {/* Sick Leave */}
                <Col sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="text-[11px] font-bold text-slate-700">Sick Leave (SL)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.5"
                      min="0"
                      value={individualForm.sl_quota}
                      onChange={(e) => setIndividualForm({ ...individualForm, sl_quota: parseFloat(e.target.value) || 0 })}
                      required
                      className="text-xs rounded-lg"
                    />
                    <span className="text-[9px] text-slate-400">No carry-forward</span>
                  </Form.Group>
                </Col>

                {/* Maternity Leave */}
                <Col sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="text-[11px] font-bold text-slate-700">Maternity (ML)</Form.Label>
                    <Form.Control
                      type="number"
                      step="1"
                      min="0"
                      value={individualForm.ml_quota}
                      onChange={(e) => setIndividualForm({ ...individualForm, ml_quota: parseFloat(e.target.value) || 0 })}
                      className="text-xs rounded-lg"
                    />
                  </Form.Group>
                </Col>

                {/* Paternity Leave */}
                <Col sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="text-[11px] font-bold text-slate-700">Paternity (PAT)</Form.Label>
                    <Form.Control
                      type="number"
                      step="1"
                      min="0"
                      value={individualForm.pat_quota}
                      onChange={(e) => setIndividualForm({ ...individualForm, pat_quota: parseFloat(e.target.value) || 0 })}
                      className="text-xs rounded-lg"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Notes */}
            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">HR Notes / Adjustment Reason</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Optional adjustment remarks..."
                value={individualForm.notes}
                onChange={(e) => setIndividualForm({ ...individualForm, notes: e.target.value })}
                className="text-xs rounded-xl"
              />
            </Form.Group>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="light" onClick={() => setShowIndividualModal(false)} className="text-xs font-semibold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={individualSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl border-0">
                {individualSaving ? "Saving Allocation..." : "Save Quota"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: GROUP / BULK LEAVE ALLOCATION                    */}
      {/* ======================================================== */}
      <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <LuUsers className="text-indigo-600" /> Group / Bulk Leave Quota Allocation ({selectedYear})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form onSubmit={handleSubmitBulk} className="space-y-4">
            {/* Target Scope Selection */}
            <div>
              <Form.Label className="text-xs font-bold text-slate-700">Target Group Selection</Form.Label>
              <Row className="g-2">
                <Col sm={6}>
                  <Form.Select
                    value={bulkForm.target_type}
                    onChange={(e) => setBulkForm({ ...bulkForm, target_type: e.target.value, target_value: "" })}
                    className="text-xs rounded-xl"
                  >
                    <option value="ALL">All Active Employees (Company-Wide)</option>
                    <option value="DEPARTMENT">Specific Department</option>
                    <option value="EMPLOYMENT_TYPE">Employment Type (Permanent / Probation)</option>
                    <option value="SPECIFIC_EMPLOYEES">Manually Select Specific Employees</option>
                  </Form.Select>
                </Col>

                {bulkForm.target_type === "DEPARTMENT" && (
                  <Col sm={6}>
                    <Form.Select
                      value={bulkForm.target_value}
                      onChange={(e) => setBulkForm({ ...bulkForm, target_value: e.target.value })}
                      required
                      className="text-xs rounded-xl"
                    >
                      <option value="">-- Choose Department --</option>
                      {departmentsList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Form.Select>
                  </Col>
                )}

                {bulkForm.target_type === "EMPLOYMENT_TYPE" && (
                  <Col sm={6}>
                    <Form.Select
                      value={bulkForm.target_value}
                      onChange={(e) => setBulkForm({ ...bulkForm, target_value: e.target.value })}
                      required
                      className="text-xs rounded-xl"
                    >
                      <option value="">-- Choose Employment Type --</option>
                      <option value="Permanent">Permanent Staff</option>
                      <option value="Probation">Probationary Staff</option>
                      <option value="Contractual">Contractual / Intern</option>
                    </Form.Select>
                  </Col>
                )}
              </Row>
            </div>

            {/* Checkbox Multi-Select for Specific Employees */}
            {bulkForm.target_type === "SPECIFIC_EMPLOYEES" && (
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 max-h-48 overflow-y-auto">
                <div className="text-[11px] font-bold text-slate-700 mb-2">Select Target Staff:</div>
                <div className="grid grid-cols-2 gap-2">
                  {employees.map(e => {
                    const id = e.employee_code || e.employee_id;
                    const checked = bulkForm.selected_emp_ids.includes(id);
                    return (
                      <label key={id} className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(ev) => {
                            const newIds = ev.target.checked
                              ? [...bulkForm.selected_emp_ids, id]
                              : bulkForm.selected_emp_ids.filter(x => x !== id);
                            setBulkForm({ ...bulkForm, selected_emp_ids: newIds });
                          }}
                        />
                        <span>{e.name} ({id})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quota Settings */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
              <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">Set Annual Quotas</div>
              <Row className="g-3">
                <Col sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="text-xs font-bold text-slate-700">Casual Leave (CL)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.5"
                      min="0"
                      value={bulkForm.cl_quota}
                      onChange={(e) => setBulkForm({ ...bulkForm, cl_quota: e.target.value })}
                      required
                      className="text-xs rounded-xl"
                    />
                  </Form.Group>
                </Col>

                <Col sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="text-xs font-bold text-slate-700">Sick Leave (SL)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.5"
                      min="0"
                      value={bulkForm.sl_quota}
                      onChange={(e) => setBulkForm({ ...bulkForm, sl_quota: e.target.value })}
                      required
                      className="text-xs rounded-xl"
                    />
                  </Form.Group>
                </Col>

                <Col sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="text-xs font-bold text-purple-900">Earned Leave (EL)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.5"
                      min="0"
                      value={bulkForm.el_quota}
                      onChange={(e) => setBulkForm({ ...bulkForm, el_quota: e.target.value })}
                      required
                      className="text-xs rounded-xl border-purple-200 bg-purple-50/40"
                    />
                  </Form.Group>
                </Col>

                <Col sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="text-xs font-bold text-indigo-900">Privilege Leave (PL)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.5"
                      min="0"
                      value={bulkForm.pl_quota}
                      onChange={(e) => setBulkForm({ ...bulkForm, pl_quota: e.target.value })}
                      required
                      className="text-xs rounded-xl border-indigo-200 bg-indigo-50/40"
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Parental / Gender-Specific Statutory Leaves */}
              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Parental &amp; Gender-Specific Allocations</span>
                  <span className="text-[10px] font-semibold text-slate-400">Statutory Checks Applied</span>
                </div>

                <Row className="g-3">
                  {/* Maternity Leave Option */}
                  <Col md={6}>
                    <div className={`p-3 rounded-2xl border transition-all ${bulkForm.include_ml ? "border-pink-300 bg-pink-50/50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer m-0">
                          <input
                            type="checkbox"
                            checked={bulkForm.include_ml}
                            onChange={(e) => setBulkForm({ ...bulkForm, include_ml: e.target.checked })}
                            className="rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                          />
                          <span className="text-xs font-bold text-slate-900">Maternity Leave (ML)</span>
                        </label>
                        <span className="text-[10px] font-extrabold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">
                          Female Staff
                        </span>
                      </div>

                      {bulkForm.include_ml ? (
                        <div className="space-y-2 mt-2 pt-2 border-t border-pink-100">
                          <Row className="g-2">
                            <Col xs={5}>
                              <Form.Label className="text-[10px] font-bold text-slate-600">Quota (Days)</Form.Label>
                              <Form.Control
                                type="number"
                                step="1"
                                min="0"
                                value={bulkForm.ml_quota}
                                onChange={(e) => setBulkForm({ ...bulkForm, ml_quota: e.target.value })}
                                className="text-xs rounded-lg"
                              />
                            </Col>
                            <Col xs={7}>
                              <Form.Label className="text-[10px] font-bold text-slate-600">Applicable To</Form.Label>
                              <Form.Select
                                value={bulkForm.ml_target}
                                onChange={(e) => setBulkForm({ ...bulkForm, ml_target: e.target.value })}
                                className="text-xs rounded-lg"
                              >
                                <option value="FEMALE_ONLY">Female Staff Only (Statutory)</option>
                                <option value="ALL">All in Selection</option>
                              </Form.Select>
                            </Col>
                          </Row>
                          <div className="text-[10px] text-pink-700 font-medium">
                            ✓ Prevents allocating 90 days to male staff.
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          Disabled — Maternity leave will NOT be allocated or changed.
                        </div>
                      )}
                    </div>
                  </Col>

                  {/* Paternity Leave Option */}
                  <Col md={6}>
                    <div className={`p-3 rounded-2xl border transition-all ${bulkForm.include_pat ? "border-sky-300 bg-sky-50/50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer m-0">
                          <input
                            type="checkbox"
                            checked={bulkForm.include_pat}
                            onChange={(e) => setBulkForm({ ...bulkForm, include_pat: e.target.checked })}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          <span className="text-xs font-bold text-slate-900">Paternity Leave (PAT)</span>
                        </label>
                        <span className="text-[10px] font-extrabold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                          Male Staff
                        </span>
                      </div>

                      {bulkForm.include_pat ? (
                        <div className="space-y-2 mt-2 pt-2 border-t border-sky-100">
                          <Row className="g-2">
                            <Col xs={5}>
                              <Form.Label className="text-[10px] font-bold text-slate-600">Quota (Days)</Form.Label>
                              <Form.Control
                                type="number"
                                step="1"
                                min="0"
                                value={bulkForm.pat_quota}
                                onChange={(e) => setBulkForm({ ...bulkForm, pat_quota: e.target.value })}
                                className="text-xs rounded-lg"
                              />
                            </Col>
                            <Col xs={7}>
                              <Form.Label className="text-[10px] font-bold text-slate-600">Applicable To</Form.Label>
                              <Form.Select
                                value={bulkForm.pat_target}
                                onChange={(e) => setBulkForm({ ...bulkForm, pat_target: e.target.value })}
                                className="text-xs rounded-lg"
                              >
                                <option value="MALE_ONLY">Male Staff Only (Statutory)</option>
                                <option value="ALL">All in Selection</option>
                              </Form.Select>
                            </Col>
                          </Row>
                          <div className="text-[10px] text-sky-700 font-medium">
                            ✓ Statutory paternity leave for male staff.
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          Disabled — Paternity leave will NOT be allocated or changed.
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200">
                <Form.Check
                  type="checkbox"
                  id="preserveCFCheck"
                  label="Preserve existing Carried-Forward balances for Earned &amp; Privilege Leaves (Recommended)"
                  checked={bulkForm.preserve_carried_forward}
                  onChange={(e) => setBulkForm({ ...bulkForm, preserve_carried_forward: e.target.checked })}
                  className="text-xs font-bold text-slate-700 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="light" onClick={() => setShowBulkModal(false)} className="text-xs font-semibold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={bulkSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl border-0">
                {bulkSaving ? "Processing Bulk Allocation..." : "Apply Quotas to Group"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: RUN YEAR-END CARRY-FORWARD & LAPSE ROLL-OVER    */}
      {/* ======================================================== */}
      <Modal show={showCarryForwardModal} onHide={() => setShowCarryForwardModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <LuRefreshCw className="text-amber-500" /> Annual Leave Carry-Forward &amp; Lapse Processor
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form onSubmit={handleProcessCarryForward} className="space-y-4">
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950">
              <div className="font-extrabold text-amber-900 flex items-center gap-2 mb-1.5 text-sm">
                <LuShieldCheck className="w-4 h-4 text-amber-600" /> Automated Roll-Over Rules Engine
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed mb-2">
                Running this roll-over will examine the closing balances of the previous year and execute statutory carry-forward calculations:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                  <span className="font-extrabold text-emerald-800">✅ Earned (EL) &amp; Privilege (PL):</span>
                  <div className="text-slate-600 mt-0.5">Carried forward up to 3 years. Stacked up to maximum <strong>45 leaves</strong>. Any excess beyond 45 or older than 3 years will automatically lapse.</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                  <span className="font-extrabold text-rose-800">❌ Casual (CL) &amp; Sick (SL):</span>
                  <div className="text-slate-600 mt-0.5">Annual quotas reset. Any unutilized Casual or Sick leave is immediately lapsed at year end.</div>
                </div>
              </div>
            </div>

            <Row className="g-3">
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="text-xs font-bold text-slate-700">From Year (Closing Balances)</Form.Label>
                  <Form.Select
                    value={cfForm.from_year}
                    onChange={(e) => setCfForm({ ...cfForm, from_year: parseInt(e.target.value, 10) })}
                    className="text-xs rounded-xl"
                  >
                    {[2023, 2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="text-xs font-bold text-slate-700">To Year (New Active Year)</Form.Label>
                  <Form.Select
                    value={cfForm.to_year}
                    onChange={(e) => setCfForm({ ...cfForm, to_year: parseInt(e.target.value, 10) })}
                    className="text-xs rounded-xl"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {cfResultSummary && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs">
                <div className="font-extrabold text-emerald-900 mb-2">🎉 Roll-Over Result Summary:</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-slate-500 font-bold">Staff Processed</div>
                    <div className="text-base font-black text-slate-900">{cfResultSummary.summary?.total_employees || 0}</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-slate-500 font-bold">Carried Forward (EL+PL)</div>
                    <div className="text-base font-black text-emerald-600">{cfResultSummary.summary?.total_carried_forward_days || 0} d</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-slate-500 font-bold">Total Lapsed</div>
                    <div className="text-base font-black text-rose-600">{cfResultSummary.summary?.total_lapsed_days || 0} d</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="light" onClick={() => setShowCarryForwardModal(false)} className="text-xs font-semibold rounded-xl">
                Close
              </Button>
              <Button type="submit" disabled={cfProcessing} className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl border-0">
                {cfProcessing ? "Executing 3-Year Carry Forward..." : `Run Carry-Forward (${cfForm.from_year} ➔ ${cfForm.to_year})`}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: 3-YEAR CARRY FORWARD & LAPSE AUDIT HISTORY       */}
      {/* ======================================================== */}
      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <LuHistory className="text-indigo-600" /> 3-Year Carry-Forward &amp; Lapse Audit Trail
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedEmployeeForHistory && (
            <div className="mb-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-extrabold text-slate-900 text-sm">{selectedEmployeeForHistory.name}</span>
                <span className="text-slate-500 ml-2">({selectedEmployeeForHistory.employee_id}) • {selectedEmployeeForHistory.dept}</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                Stacking Cap: 45 Days • 3 Years Max
              </span>
            </div>
          )}

          {historyLoading ? (
            <div className="py-12 text-center text-slate-400">
              <Spinner animation="border" size="sm" className="mb-2" />
              <div className="text-xs font-semibold">Loading carry forward ledger...</div>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <LuHistory className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <div className="text-xs font-bold text-slate-700">No Historical Carry Forward Logs</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Logs are recorded when annual carry-forward roll-overs are executed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table hover className="text-xs mb-0 align-middle">
                <thead className="bg-slate-100/80 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Roll-Over Cycle</th>
                    <th className="py-2.5 px-3">Leave Type</th>
                    <th className="py-2.5 px-3 text-center">Unutilized Balance</th>
                    <th className="py-2.5 px-3 text-center">Actual Carried (Stacked)</th>
                    <th className="py-2.5 px-3 text-center">Excess / Expired Lapsed</th>
                    <th className="py-2.5 px-3 text-center">Expiry Year</th>
                    <th className="py-2.5 px-3 text-end">Processed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLogs.map(log => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {log.from_year} ➔ {log.to_year}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {log.leave_type} ({log.leave_code})
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {log.unutilized_balance} d
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          +{log.actual_carried_forward} d
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {parseFloat(log.excess_lapsed) > 0 ? (
                          <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            ⚠️ {log.excess_lapsed} d
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {log.expiry_year} (Yr 3)
                      </td>
                      <td className="py-2.5 px-3 text-end text-slate-500 font-medium">
                        {log.processed_by || "HR"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

