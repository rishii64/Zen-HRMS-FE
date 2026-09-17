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
  const [activeTab, setActiveTab] = useState("details"); // "details" | "clearance"
  const [saving, setSaving] = useState(false);

  // Calculate default LWD (1 month from today)
  const getDefaultLWD = (days = 30) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  // Form State
  const [formData, setFormData] = useState({
    last_working_date: getDefaultLWD(30),
    notice_period: "1 month",
    reason: "",
    reason_details: "",
    schedule_exit_interview: true,
    interview_preferred_date: `${getDefaultLWD(28)}T10:30`,
    interview_mode: "In person", // "In person" | "Video call"

    // Step 2: Clearance & Submission
    handover_person_id: "",
    handover_person_name: "",
    handover_target_date: getDefaultLWD(25),
    handover_note: "",
    reassign_items_to_id: "",
    reassign_items_to_name: "",
    email_forwarding_to_id: "",
    email_forwarding_to_name: "",

    // Acknowledgements
    ack_claims_expenses: false,
    ack_final_pay: false,
    ack_return_assets: false
  });

  // Populate data when editing draft or opening modal
  useEffect(() => {
    if (initialData) {
      setFormData({
        last_working_date: initialData.last_working_date || getDefaultLWD(30),
        notice_period: initialData.notice_period || "1 month",
        reason: initialData.reason || "",
        reason_details: initialData.reason_details || "",
        schedule_exit_interview: initialData.schedule_exit_interview !== undefined ? initialData.schedule_exit_interview : true,
        interview_preferred_date: initialData.interview_preferred_date || `${getDefaultLWD(28)}T10:30`,
        interview_mode: initialData.interview_mode || "In person",
        handover_person_id: initialData.handover_person_id || "",
        handover_person_name: initialData.handover_person_name || "",
        handover_target_date: initialData.handover_target_date || getDefaultLWD(25),
        handover_note: initialData.handover_note || "",
        reassign_items_to_id: initialData.reassign_items_to_id || "",
        reassign_items_to_name: initialData.reassign_items_to_name || "",
        email_forwarding_to_id: initialData.email_forwarding_to_id || "",
        email_forwarding_to_name: initialData.email_forwarding_to_name || "",
        ack_claims_expenses: !!initialData.ack_claims_expenses,
        ack_final_pay: !!initialData.ack_final_pay,
        ack_return_assets: !!initialData.ack_return_assets
      });
    } else {
      setFormData({
        last_working_date: getDefaultLWD(30),
        notice_period: "1 month",
        reason: "",
        reason_details: "",
        schedule_exit_interview: true,
        interview_preferred_date: `${getDefaultLWD(28)}T10:30`,
        interview_mode: "In person",
        handover_person_id: "",
        handover_person_name: "",
        handover_target_date: getDefaultLWD(25),
        handover_note: "",
        reassign_items_to_id: "",
        reassign_items_to_name: "",
        email_forwarding_to_id: "",
        email_forwarding_to_name: "",
        ack_claims_expenses: false,
        ack_final_pay: false,
        ack_return_assets: false
      });
    }
    setActiveTab("details");
  }, [initialData, isOpen]);

  // Handle notice period change -> adjust default LWD
  const handleNoticePeriodChange = (np) => {
    const item = NOTICE_PERIODS.find(p => p.value === np);
    const days = item ? item.days : 30;
    setFormData(prev => ({
      ...prev,
      notice_period: np,
      last_working_date: getDefaultLWD(days),
      handover_target_date: getDefaultLWD(Math.max(1, days - 5)),
      interview_preferred_date: `${getDefaultLWD(Math.max(1, days - 2))}T10:30`
    }));
  };

  const handlePersonSelect = (fieldId, fieldName, empId) => {
    const selectedEmp = employees.find(e => (e.employee_id === empId || e.id === empId || e.employee_code === empId));
    const name = selectedEmp ? (selectedEmp.name || `${selectedEmp.first_name || ""} ${selectedEmp.last_name || ""}`.trim() || selectedEmp.employee_name || empId) : "";
    setFormData(prev => ({
      ...prev,
      [fieldId]: empId,
      [fieldName]: name
    }));
  };

  const handleNext = () => {
    if (!formData.last_working_date) {
      toast.error("Please select your Last Working Date");
      return;
    }
    if (!formData.reason) {
      toast.error("Please select a Reason for resignation");
      return;
    }
    setActiveTab("clearance");
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft) {
      if (!formData.last_working_date) {
        toast.error("Please specify your Last Working Date");
        setActiveTab("details");
        return;
      }
      if (!formData.reason) {
        toast.error("Please select a Reason for resignation");
        setActiveTab("details");
        return;
      }
      if (!formData.ack_claims_expenses || !formData.ack_final_pay || !formData.ack_return_assets) {
        toast.error("Please accept all final pay & asset return acknowledgements");
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
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            Employee resignation form
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`pb-3 pt-3 text-xs font-semibold relative transition-colors ${
              activeTab === "details"
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            Resignation details
            {activeTab === "details" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (formData.reason) {
                setActiveTab("clearance");
              } else {
                toast("Please select a reason first", { icon: "ℹ️" });
              }
            }}
            className={`pb-3 pt-3 text-xs font-semibold relative transition-colors ${
              activeTab === "clearance"
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            Clearance and submission
            {activeTab === "clearance" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-800 dark:text-slate-200 text-xs">
          {activeTab === "details" ? (
            /* TAB 1: RESIGNATION DETAILS */
            <div className="space-y-4 animate-in fade-in duration-150">
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
                  Additional details (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add a short note for your manager or HR"
                  value={formData.reason_details}
                  onChange={(e) => setFormData({ ...formData, reason_details: e.target.value })}
                  className="w-full p-3 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Row 4: Schedule an exit interview toggle */}
              <div className="pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Schedule an exit interview
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      HR will confirm the time after you submit
                    </span>
                  </div>
                  {/* Switch Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.schedule_exit_interview}
                      onChange={(e) => setFormData({ ...formData, schedule_exit_interview: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* If Exit Interview enabled, show Preferred Date & Mode */}
                {formData.schedule_exit_interview && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Preferred date & time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.interview_preferred_date}
                        onChange={(e) => setFormData({ ...formData, interview_preferred_date: e.target.value })}
                        className="w-full h-10 px-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Interview mode
                      </label>
                      {/* Segmented Pill Selector matching image */}
                      <div className="flex h-10 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, interview_mode: "In person" })}
                          className={`flex-1 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                            formData.interview_mode === "In person"
                              ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                          }`}
                        >
                          In person
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, interview_mode: "Video call" })}
                          className={`flex-1 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                            formData.interview_mode === "Video call"
                              ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                          }`}
                        >
                          Video call
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: CLEARANCE AND SUBMISSION */
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Row 1: Handover Person & Target Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Handover Person */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Handover Person
                  </label>
                  <div className="relative">
                    <select
                      value={formData.handover_person_id}
                      onChange={(e) => handlePersonSelect("handover_person_id", "handover_person_name", e.target.value)}
                      className="w-full h-10 px-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer pr-9"
                    >
                      <option value="">Select a person</option>
                      {employees.map((emp) => {
                        const id = emp.employee_id || emp.employee_code || emp.id;
                        const name = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_name || id;
                        const dept = emp.dept || emp.department ? ` (${emp.dept || emp.department})` : "";
                        return (
                          <option key={id} value={id}>
                            {name}{dept}
                          </option>
                        );
                      })}
                    </select>
                    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>

                {/* Handover completion target date */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Handover completion target date
                  </label>
                  <input
                    type="date"
                    value={formData.handover_target_date}
                    onChange={(e) => setFormData({ ...formData, handover_target_date: e.target.value })}
                    className="w-full h-10 px-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Row 2: Handover note (optional) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Handover note (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter a handover note"
                  value={formData.handover_note}
                  onChange={(e) => setFormData({ ...formData, handover_note: e.target.value })}
                  className="w-full p-3 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Row 3: Reassign work items to & Email forwarding contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reassign work items to (optional) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reassign work items to (optional)
                  </label>
                  <div className="relative">
                    <select
                      value={formData.reassign_items_to_id}
                      onChange={(e) => handlePersonSelect("reassign_items_to_id", "reassign_items_to_name", e.target.value)}
                      className="w-full h-10 px-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer pr-9"
                    >
                      <option value="">Select a person</option>
                      {employees.map((emp) => {
                        const id = emp.employee_id || emp.employee_code || emp.id;
                        const name = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_name || id;
                        return (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>

                {/* Email forwarding contact (optional) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email forwarding contact (optional)
                  </label>
                  <div className="relative">
                    <select
                      value={formData.email_forwarding_to_id}
                      onChange={(e) => handlePersonSelect("email_forwarding_to_id", "email_forwarding_to_name", e.target.value)}
                      className="w-full h-10 px-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer pr-9"
                    >
                      <option value="">Select a person</option>
                      {employees.map((emp) => {
                        const id = emp.employee_id || emp.employee_code || emp.id;
                        const name = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_name || id;
                        return (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Final pay and acknowledgements section */}
              <div className="pt-2">
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-2.5">
                  Final pay and acknowledgements
                </h3>

                <div className="space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.ack_claims_expenses}
                      onChange={(e) => setFormData({ ...formData, ack_claims_expenses: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      I confirm I have submitted all claims and expenses.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.ack_final_pay}
                      onChange={(e) => setFormData({ ...formData, ack_final_pay: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      I understand final pay will be processed after clearance.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.ack_return_assets}
                      onChange={(e) => setFormData({ ...formData, ack_return_assets: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      I confirm I will return all company assets by my last working day.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          {activeTab === "details" ? (
            <>
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
                onClick={handleNext}
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
              >
                Next
              </button>
            </>
          ) : (
            <>
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
                onClick={() => setActiveTab("details")}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
