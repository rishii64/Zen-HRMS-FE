import React, { useState, useEffect } from "react";
import { FiX, FiCalendar, FiChevronDown, FiClock, FiUser, FiCheck, FiInfo } from "react-icons/fi";
import toast from "react-hot-toast";
import { getApiBaseUrl } from "../../api/axios";

const API = getApiBaseUrl();

const REASONS_LIST = [
  "Better Career Opportunity",
  "Higher Studies / Education",
  "Relocation / Moving",
  "Personal / Family Reasons",
  "Health & Medical Reasons",
  "Compensation & Benefits",
  "Career Transition / Industry Change",
  "Work-Life Balance / Commute",
  "Entrepreneurship / Starting Business",
  "Other"
];

const NOTICE_PERIODS = [
  { value: "15 days", label: "15 days", days: 15 },
  { value: "1 month", label: "1 month", days: 30 },
  { value: "2 months", label: "2 months", days: 60 },
  { value: "3 months", label: "3 months", days: 90 },
];

export default function ResignationModal({
  isOpen,
  onClose,
  initialData = null,
  onSuccess,
  employees = []
}) {
  const [saving, setSaving] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmpId = localStorage.getItem("employeeCode") || localStorage.getItem("empId") || storedUser.employee_id || "";
  const userName = localStorage.getItem("userName") || storedUser.name || "Employee";

  const currentEmp = employees.find(
    (e) => (e.employee_code || e.employee_id) === userEmpId || e.name === userName
  ) || storedUser;

  const empDept = currentEmp.dept || currentEmp.department || storedUser.dept || "General";
  const empDesig = currentEmp.designation || storedUser.designation || "Associate";
  const empJoining = currentEmp.joining_date || storedUser.joining_date || "—";
  const empManager = currentEmp.reporting_manager || storedUser.reporting_manager || "Management";
  const empEmail = currentEmp.work_email || currentEmp.email || storedUser.email || "—";

  // Calculate default LWD (1 month from today)
  const getDefaultLWD = (days = 30) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  // Form State - strictly employee details & reason
  const [formData, setFormData] = useState({
    last_working_date: getDefaultLWD(30),
    notice_period: "1 month",
    reason: "",
    reason_details: ""
  });

  // Populate data when editing draft or opening modal
  useEffect(() => {
    if (initialData) {
      setFormData({
        last_working_date: initialData.last_working_date || getDefaultLWD(30),
        notice_period: initialData.notice_period || "1 month",
        reason: initialData.reason || "",
        reason_details: initialData.reason_details || ""
      });
    } else {
      setFormData({
        last_working_date: getDefaultLWD(30),
        notice_period: "1 month",
        reason: "",
        reason_details: ""
      });
    }
  }, [initialData, isOpen]);

  // Handle notice period change -> adjust default LWD
  const handleNoticePeriodChange = (np) => {
    const item = NOTICE_PERIODS.find(p => p.value === np);
    const days = item ? item.days : 30;
    setFormData(prev => ({
      ...prev,
      notice_period: np,
      last_working_date: getDefaultLWD(days)
    }));
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft) {
      if (!formData.last_working_date) {
        toast.error("Please specify your Last Working Date");
        return;
      }
      if (!formData.reason) {
        toast.error("Please select a Reason for resignation");
        return;
      }
    }

    setSaving(true);
    const token = localStorage.getItem("token");

    try {
      const payload = {
        ...formData,
        is_draft: isDraft
      };

      const res = await fetch(`${API}/resignation/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit resignation");
      }

      toast.success(isDraft ? "Draft saved successfully" : "Resignation filed successfully!");
      if (onSuccess) onSuccess(data.data);
      onClose();
    } catch (err) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-200">
      <div 
        className="relative w-full max-w-[620px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Employee Resignation Form
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit your formal separation notice
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-800 dark:text-slate-200 text-xs">
          {/* Employee Details Profile Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  {userName ? userName[0] : "E"}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {userName} <span className="text-[10px] text-slate-500 font-normal">({userEmpId})</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {empDesig} • {empDept}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50">
                Filing Resignation
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Joining Date</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{empJoining}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Reporting Manager</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{empManager}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[10px]">Work Email</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{empEmail}</span>
              </div>
            </div>
          </div>

          {/* Workflow Routing Roadmap Notification Card */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/50 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-blue-900 dark:text-blue-300">
              <FiInfo className="w-3.5 h-3.5 text-blue-600" />
              <span>Resignation Workflow & Approval Stages</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
              <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">1. TL Review</span>
              <span className="text-blue-400">➔</span>
              <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">2. Manager Review</span>
              <span className="text-blue-400">➔</span>
              <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-400 font-bold">3. HOD Approval & Handover Assignment</span>
              <span className="text-blue-400">➔</span>
              <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400 font-bold">4. Handover Completion & Confirmation</span>
              <span className="text-blue-400">➔</span>
              <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-400 font-bold">5. HR Final Approval & Clearance</span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
              • <strong>Handover Workflow</strong>: When your HOD approves, they assign an employee to take over your documents and projects. You and the assigned employee will complete and confirm the handover before final HR approval. HR monitors the entire process.
            </p>
          </div>

          {/* Row 1: Last working date & Notice period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Last working date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Last working date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.last_working_date}
                  onChange={(e) => setFormData({ ...formData, last_working_date: e.target.value })}
                  className="w-full h-10 px-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* Notice period */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Notice period
              </label>
              <div className="relative">
                <select
                  value={formData.notice_period}
                  onChange={(e) => handleNoticePeriodChange(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer pr-9"
                >
                  {NOTICE_PERIODS.map((np) => (
                    <option key={np.value} value={np.value}>
                      {np.label}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
              </div>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                Calculated from your contract. Update only if approved
              </p>
            </div>
          </div>

          {/* Row 2: Reason for resignation */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason for resignation <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full h-10 px-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer pr-9"
              >
                <option value="">Select a reason</option>
                {REASONS_LIST.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
            </div>
          </div>

          {/* Row 3: Additional details (optional) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Additional details / explanation (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add any additional context or details for management and HR..."
              value={formData.reason_details}
              onChange={(e) => setFormData({ ...formData, reason_details: e.target.value })}
              className="w-full p-3 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 pt-3 bg-slate-50/70 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all disabled:opacity-50"
          >
            Save as draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit Resignation"}
          </button>
        </div>
      </div>
    </div>
  );
}
