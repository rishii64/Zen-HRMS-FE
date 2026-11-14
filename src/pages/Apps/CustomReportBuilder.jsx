import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LuFileSpreadsheet,
  LuDownload,
  LuFileText,
  LuCalendar,
  LuSearch,
  LuPrinter,
  LuCircleCheck,
  LuRefreshCw,
  LuUsers,
  LuClock,
  LuWallet,
  LuSlidersHorizontal,
  LuTableProperties,
  LuCheck,
  LuX,
  LuPlus,
  LuTrash2,
  LuSave,
  LuEye,
  LuFilter,
  LuChevronDown,
  LuChevronRight,
  LuArrowRight,
  LuSparkles,
  LuBuilding2,
  LuUser,
  LuCalendarDays,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api/axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Fallback Field Catalog Definitions
const FALLBACK_CATALOG = [
  {
    category: "employee",
    categoryLabel: "Employee Information",
    icon: LuUser,
    color: "blue",
    fields: [
      { key: "employee_id", label: "Employee ID", default: true, type: "string" },
      { key: "full_name", label: "Full Name", default: true, type: "string" },
      { key: "email", label: "Email Address", default: true, type: "string" },
      { key: "phone_no", label: "Phone Number", default: false, type: "string" },
      { key: "dept", label: "Department", default: true, type: "string" },
      { key: "designation", label: "Designation", default: true, type: "string" },
      { key: "job_role", label: "Job Role", default: false, type: "string" },
      { key: "work_location", label: "Work Location / Branch", default: true, type: "string" },
      { key: "employment_type", label: "Employment Type", default: false, type: "string" },
      { key: "status", label: "Employment Status", default: true, type: "badge" },
      { key: "joining_date", label: "Joining Date", default: true, type: "date" },
      { key: "gender", label: "Gender", default: false, type: "string" },
      { key: "dob", label: "Date of Birth", default: false, type: "date" },
      { key: "reporting_manager", label: "Reporting Manager", default: false, type: "string" },
      { key: "pan_no", label: "PAN Number", default: false, type: "string" },
      { key: "aadhaar_no", label: "Aadhaar Number", default: false, type: "string" },
      { key: "bank_account", label: "Bank Account No.", default: false, type: "string" },
      { key: "bank_name", label: "Bank Name", default: false, type: "string" },
    ],
  },
  {
    category: "attendance",
    categoryLabel: "Attendance & Time Tracking",
    icon: LuClock,
    color: "amber",
    fields: [
      { key: "expected_working_days", label: "Working Days", default: false, type: "number" },
      { key: "present_days", label: "Present Days", default: true, type: "number" },
      { key: "absent_days", label: "Absent Days", default: true, type: "number" },
      { key: "late_days", label: "Late Arrivals", default: true, type: "number" },
      { key: "half_days", label: "Half Days", default: false, type: "number" },
      { key: "attendance_percentage", label: "Attendance %", default: true, type: "percentage" },
      { key: "approved_leave_days", label: "Approved Leaves (Period)", default: false, type: "number" },
      { key: "holiday_days", label: "Company Holidays (Period)", default: false, type: "number" },
      { key: "holidays_worked", label: "Holidays Worked", default: false, type: "number" },
      { key: "avg_daily_hours", label: "Avg Daily Hours", default: false, type: "hours" },
      { key: "total_work_hours", label: "Total Logged Hours", default: false, type: "hours" },
      { key: "overtime_hours", label: "Overtime Hours", default: false, type: "hours" },
      { key: "last_punch_date", label: "Last Punch Date", default: false, type: "date" },
    ],
  },
  {
    category: "holiday",
    categoryLabel: "Holiday & Working Calendar",
    icon: LuCalendarDays,
    color: "teal",
    fields: [
      { key: "holiday_days", label: "Company Holidays (Count)", default: false, type: "number" },
      { key: "holidays_worked", label: "Holidays Worked", default: false, type: "number" },
      { key: "holiday_names", label: "Holiday Names (Period)", default: false, type: "string" },
      { key: "weekly_off_days", label: "Weekly Off Schedule", default: false, type: "string" },
    ],
  },
  {
    category: "leave",
    categoryLabel: "Leave & Balances",
    icon: LuCalendar,
    color: "emerald",
    fields: [
      { key: "total_leaves_taken", label: "Total Leaves Taken", default: true, type: "number" },
      { key: "cl_balance", label: "CL Balance", default: true, type: "number" },
      { key: "sl_balance", label: "SL Balance", default: true, type: "number" },
      { key: "el_balance", label: "EL / Privilege Balance", default: true, type: "number" },
      { key: "total_leave_balance", label: "Total Leave Balance", default: false, type: "number" },
      { key: "pending_leaves", label: "Pending Leave Requests", default: false, type: "number" },
      { key: "rejected_leaves", label: "Rejected Requests", default: false, type: "number" },
      { key: "lop_days", label: "Loss of Pay (LOP) Days", default: false, type: "number" },
    ],
  },
  {
    category: "payroll",
    categoryLabel: "Payroll & Compensation",
    icon: LuWallet,
    color: "indigo",
    fields: [
      { key: "gross_salary", label: "Gross Salary (₹)", default: true, type: "currency" },
      { key: "basic_salary", label: "Basic Pay (₹)", default: false, type: "currency" },
      { key: "hra", label: "HRA (₹)", default: false, type: "currency" },
      { key: "conveyance", label: "Conveyance (₹)", default: false, type: "currency" },
      { key: "medical_allowance", label: "Medical Allowance (₹)", default: false, type: "currency" },
      { key: "special_allowance", label: "Special Allowance (₹)", default: false, type: "currency" },
      { key: "pf_employee", label: "PF Employee (₹)", default: false, type: "currency" },
      { key: "esi_employee", label: "ESI Employee (₹)", default: false, type: "currency" },
      { key: "professional_tax", label: "Professional Tax (₹)", default: false, type: "currency" },
      { key: "tds", label: "TDS / Tax Withheld (₹)", default: false, type: "currency" },
      { key: "total_deductions", label: "Total Deductions (₹)", default: true, type: "currency" },
      { key: "net_salary", label: "Net Take-Home (₹)", default: true, type: "currency" },
      { key: "payment_status", label: "Payment Status", default: false, type: "badge" },
      { key: "payment_mode", label: "Payment Mode", default: false, type: "string" },
    ],
  },
];

export default function CustomReportBuilder() {
  const [catalog, setCatalog] = useState(FALLBACK_CATALOG);
  const [presets, setPresets] = useState([]);
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      const saved = localStorage.getItem("hrms_custom_report_presets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activePresetId, setActivePresetId] = useState(() => {
    try {
      return localStorage.getItem("hrms_active_report_preset_id") || "executive_summary";
    } catch {
      return "executive_summary";
    }
  });

  const [activePresetName, setActivePresetName] = useState(() => {
    try {
      return localStorage.getItem("hrms_active_report_preset_name") || "Executive 360° Overview";
    } catch {
      return "Executive 360° Overview";
    }
  });

  const [isModifiedFromPreset, setIsModifiedFromPreset] = useState(false);

  // Initialize selectedColumns from localStorage if previously chosen
  const [selectedColumns, setSelectedColumns] = useState(() => {
    try {
      const saved = localStorage.getItem("hrms_active_report_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      "employee_id",
      "full_name",
      "dept",
      "designation",
      "work_location",
      "status",
      "attendance_percentage",
      "present_days",
      "absent_days",
      "total_leaves_taken",
      "total_leave_balance",
      "gross_salary",
      "net_salary",
    ];
  });

  // Local Date Formatter helper to avoid UTC timezone day-shifting
  const formatLocalDateYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Filters
  const now = new Date();
  const firstDay = formatLocalDateYMD(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDay = formatLocalDateYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [department, setDepartment] = useState("All");
  const [workLocation, setWorkLocation] = useState("All");
  const [employmentStatus, setEmploymentStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOptions, setFilterOptions] = useState({
    departments: ["All"],
    locations: ["All"],
    statuses: ["All", "Active", "Inactive", "Resigned"],
  });

  // Table Data & Status
  const [reportRows, setReportRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // UI State
  const [fieldSearch, setFieldSearch] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Track column modifications and persist selected columns
  useEffect(() => {
    try {
      localStorage.setItem("hrms_active_report_columns", JSON.stringify(selectedColumns));
    } catch (e) {}

    const allAvailablePresets = [...presets, ...customPresets];
    const currentPreset = allAvailablePresets.find((p) => p.id === activePresetId);
    if (currentPreset && Array.isArray(currentPreset.columns)) {
      const isSame =
        currentPreset.columns.length === selectedColumns.length &&
        currentPreset.columns.every((c, i) => c === selectedColumns[i]);
      setIsModifiedFromPreset(!isSame);
    } else {
      setIsModifiedFromPreset(true);
    }
  }, [selectedColumns, presets, customPresets, activePresetId]);

  const hasFetchedInitialRef = useRef(false);

  // Fetch Catalog & Presets on mount (runs once)
  useEffect(() => {
    if (hasFetchedInitialRef.current) return;
    hasFetchedInitialRef.current = true;
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await api.get("/reports/custom-builder/catalog");
      if (res.data?.success) {
        if (res.data.catalog && res.data.catalog.length > 0) {
          // Merge icons and colors into backend catalog
          const iconLookup = {
            employee: { icon: LuUser, color: "blue" },
            attendance: { icon: LuClock, color: "amber" },
            holiday: { icon: LuCalendarDays, color: "teal" },
            leave: { icon: LuCalendar, color: "emerald" },
            payroll: { icon: LuWallet, color: "indigo" },
          };
          const merged = res.data.catalog.map((cat, idx) => {
            const meta = iconLookup[cat.category] || FALLBACK_CATALOG[idx] || FALLBACK_CATALOG[0];
            return {
              ...cat,
              icon: meta.icon || LuTableProperties,
              color: meta.color || "blue",
            };
          });
          setCatalog(merged);
        }
        if (res.data.presets) {
          setPresets(res.data.presets);
        }
        if (res.data.filterOptions) {
          setFilterOptions(res.data.filterOptions);
        }
      }
    } catch (err) {
      console.warn("Using fallback catalog metadata:", err.message);
    } finally {
      setCatalogLoading(false);
      // Run initial report silently with current selected columns
      generateReport(false, selectedColumns);
    }
  };

  // Generate Report
  const generateReport = async (isManual = false, overrideColumns = null) => {
    setLoading(true);
    const colsToSend = overrideColumns || selectedColumns;
    try {
      const res = await api.post("/reports/custom-builder/generate", {
        selectedColumns: colsToSend,
        startDate,
        endDate,
        department,
        workLocation,
        employmentStatus,
        search: searchQuery,
      });

      if (res.data?.success) {
        setReportRows(res.data.rows || []);
        setSummary(res.data.summary || null);
        if (isManual) {
          toast.success(`Generated report with ${res.data.rows?.length || 0} records.`, {
            id: "custom-report-status",
          });
        }
      } else {
        toast.error(res.data?.error || "Failed to generate report", {
          id: "custom-report-status",
        });
      }
    } catch (err) {
      console.error("Report generation error:", err);
      toast.error(err.response?.data?.error || "Error generating report", {
        id: "custom-report-status",
      });
    } finally {
      setLoading(false);
    }
  };

  // Map of all fields keyed by field.key
  const fieldDict = useMemo(() => {
    const dict = {};
    for (const cat of catalog) {
      for (const f of cat.fields) {
        dict[f.key] = { ...f, category: cat.category, categoryLabel: cat.categoryLabel };
      }
    }
    return dict;
  }, [catalog]);

  // Toggle field selection
  const handleToggleColumn = (key) => {
    if (selectedColumns.includes(key)) {
      if (selectedColumns.length <= 1) {
        toast.error("At least one column must remain selected.");
        return;
      }
      setSelectedColumns((prev) => prev.filter((col) => col !== key));
    } else {
      setSelectedColumns((prev) => [...prev, key]);
    }
  };

  // Reorder column left/right
  const handleMoveColumn = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= selectedColumns.length) return;
    const updated = [...selectedColumns];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    setSelectedColumns(updated);
  };

  // Select all fields in a category
  const handleSelectAllCategory = (cat) => {
    const catKeys = cat.fields.map((f) => f.key);
    const missing = catKeys.filter((k) => !selectedColumns.includes(k));
    if (missing.length === 0) {
      // Deselect all from category (keep at least 1 overall)
      const remaining = selectedColumns.filter((k) => !catKeys.includes(k));
      if (remaining.length === 0) {
        toast.error("Cannot deselect all fields in the entire report.");
        return;
      }
      setSelectedColumns(remaining);
    } else {
      setSelectedColumns((prev) => [...prev, ...missing]);
    }
  };

  // Apply a preset
  const handleApplyPreset = (preset) => {
    if (preset && preset.columns && preset.columns.length > 0) {
      setSelectedColumns(preset.columns);
      setActivePresetId(preset.id);
      setActivePresetName(preset.name);
      setIsModifiedFromPreset(false);
      try {
        localStorage.setItem("hrms_active_report_preset_id", preset.id);
        localStorage.setItem("hrms_active_report_preset_name", preset.name);
        localStorage.setItem("hrms_active_report_columns", JSON.stringify(preset.columns));
      } catch (e) {}
      toast.success(`Applied template: "${preset.name}"`, { id: "custom-report-status" });
      generateReport(false, preset.columns);
    }
  };

  // Save Current as Custom Preset
  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    const trimmedName = newPresetName.trim();
    const newPreset = {
      id: "custom_" + Date.now(),
      name: trimmedName,
      description: `Custom template with ${selectedColumns.length} columns`,
      columns: [...selectedColumns],
      createdAt: new Date().toLocaleDateString(),
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    setActivePresetId(newPreset.id);
    setActivePresetName(newPreset.name);
    setIsModifiedFromPreset(false);

    try {
      localStorage.setItem("hrms_custom_report_presets", JSON.stringify(updated));
      localStorage.setItem("hrms_active_report_preset_id", newPreset.id);
      localStorage.setItem("hrms_active_report_preset_name", newPreset.name);
      localStorage.setItem("hrms_active_report_columns", JSON.stringify(selectedColumns));
      toast.success(`Saved and activated template: "${newPreset.name}"`, { id: "custom-report-status" });
      setNewPresetName("");
      setShowSavePresetModal(false);
    } catch (e) {
      toast.error("Failed to save template to browser storage");
    }
  };

  // Update existing active custom preset with current columns
  const handleUpdateActivePreset = () => {
    if (!activePresetId.startsWith("custom_")) {
      setShowSavePresetModal(true);
      return;
    }
    const updated = customPresets.map((p) => {
      if (p.id === activePresetId) {
        return {
          ...p,
          columns: [...selectedColumns],
          description: `Custom template with ${selectedColumns.length} columns`,
          updatedAt: new Date().toLocaleDateString(),
        };
      }
      return p;
    });
    setCustomPresets(updated);
    setIsModifiedFromPreset(false);
    try {
      localStorage.setItem("hrms_custom_report_presets", JSON.stringify(updated));
      localStorage.setItem("hrms_active_report_columns", JSON.stringify(selectedColumns));
      toast.success(`Updated template: "${activePresetName}"`, { id: "custom-report-status" });
    } catch (e) {
      toast.error("Failed to update template");
    }
  };

  // Delete Custom Preset
  const handleDeleteCustomPreset = (id) => {
    const target = customPresets.find((p) => p.id === id);
    const targetName = target ? target.name : "Custom template";
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    try {
      localStorage.setItem("hrms_custom_report_presets", JSON.stringify(updated));
      toast.success(`Removed template: "${targetName}"`, { id: "custom-report-status" });
      if (activePresetId === id) {
        const fallback = presets[0] || PRESET_TEMPLATES[0];
        handleApplyPreset(fallback);
      }
    } catch (e) {}
  };

  // Quick Date Range Helpers
  const setQuickDateRange = (rangeType) => {
    const d = new Date();
    if (rangeType === "this_month") {
      setStartDate(formatLocalDateYMD(new Date(d.getFullYear(), d.getMonth(), 1)));
      setEndDate(formatLocalDateYMD(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
    } else if (rangeType === "last_month") {
      setStartDate(formatLocalDateYMD(new Date(d.getFullYear(), d.getMonth() - 1, 1)));
      setEndDate(formatLocalDateYMD(new Date(d.getFullYear(), d.getMonth(), 0)));
    } else if (rangeType === "quarter") {
      const qMonth = Math.floor(d.getMonth() / 3) * 3;
      setStartDate(formatLocalDateYMD(new Date(d.getFullYear(), qMonth, 1)));
      setEndDate(formatLocalDateYMD(new Date(d.getFullYear(), qMonth + 3, 0)));
    } else if (rangeType === "ytd") {
      setStartDate(formatLocalDateYMD(new Date(d.getFullYear(), 0, 1)));
      setEndDate(formatLocalDateYMD(d));
    }
  };

  // Formatter for values
  const formatCellValue = (val, type) => {
    if (val === undefined || val === null || val === "" || val === "—") return "—";
    if (type === "currency") {
      const n = Number(val);
      return isNaN(n) ? val : "₹" + n.toLocaleString("en-IN");
    }
    if (type === "percentage") {
      const n = Number(val);
      return isNaN(n) ? val : `${n}%`;
    }
    if (type === "hours") {
      const n = Number(val);
      return isNaN(n) ? val : `${n} hrs`;
    }
    if (type === "badge") {
      const st = String(val).toLowerCase();
      let color = "bg-gray-100 text-gray-700";
      if (st.includes("active") || st.includes("processed") || st.includes("present") || st.includes("paid")) {
        color = "bg-emerald-100 text-emerald-800 border-emerald-300";
      } else if (st.includes("resigned") || st.includes("inactive") || st.includes("failed")) {
        color = "bg-rose-100 text-rose-800 border-rose-300";
      } else if (st.includes("pending") || st.includes("hold")) {
        color = "bg-amber-100 text-amber-800 border-amber-300";
      }
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
          {val}
        </span>
      );
    }
    return String(val);
  };

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortField) return reportRows;
    const sorted = [...reportRows].sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (va === "—" || va === undefined || va === null) va = "";
      if (vb === "—" || vb === undefined || vb === null) vb = "";

      const numA = parseFloat(va);
      const numB = parseFloat(vb);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }
      return sortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return sorted;
  }, [reportRows, sortField, sortAsc]);

  const handleSort = (fieldKey) => {
    if (sortField === fieldKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(fieldKey);
      setSortAsc(true);
    }
  };

  // ==========================================
  // EXPORT HANDLERS
  // ==========================================
  // 1. Excel (.xlsx) Export
  const handleExportExcel = () => {
    if (!reportRows || reportRows.length === 0) {
      toast.error("No report data available to export.");
      return;
    }

    try {
      // Map columns to header labels
      const headers = selectedColumns.map((col) => fieldDict[col]?.label || col);
      const exportData = reportRows.map((row) => {
        const rowObj = {};
        selectedColumns.forEach((col) => {
          const label = fieldDict[col]?.label || col;
          const val = row[col];
          rowObj[label] = val === "—" || val === undefined ? "" : val;
        });
        return rowObj;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto calculate column widths
      const colWidths = headers.map((h) => ({
        wch: Math.max(h.length + 4, 14),
      }));
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Report");

      const filename = `HRMS_Custom_Report_${formatLocalDateYMD(new Date())}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast.success(`Exported Excel report: ${filename}`);
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to export Excel file.");
    }
  };

  // 2. CSV Export
  const handleExportCSV = () => {
    if (!reportRows || reportRows.length === 0) {
      toast.error("No report data available to export.");
      return;
    }

    try {
      const headers = selectedColumns.map((col) => `"${(fieldDict[col]?.label || col).replace(/"/g, '""')}"`);
      const csvLines = [headers.join(",")];

      reportRows.forEach((row) => {
        const line = selectedColumns.map((col) => {
          const val = row[col];
          const str = val === undefined || val === null || val === "—" ? "" : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        });
        csvLines.push(line.join(","));
      });

      const csvContent = "\uFEFF" + csvLines.join("\r\n"); // UTF-8 BOM
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `HRMS_Custom_Report_${formatLocalDateYMD(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV file downloaded successfully.");
    } catch (err) {
      console.error("CSV export error:", err);
      toast.error("Failed to generate CSV file.");
    }
  };

  // 3. PDF Export
  const handleExportPDF = () => {
    if (!reportRows || reportRows.length === 0) {
      toast.error("No report data available to export.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: selectedColumns.length > 7 ? "landscape" : "portrait",
        unit: "pt",
        format: "a4",
      });

      // Title & Header
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text("Zentelex HRMS - Custom Ad-Hoc Report", 40, 40);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated: ${new Date().toLocaleString()} | Period: ${startDate} to ${endDate} | Total Records: ${reportRows.length}`,
        40,
        56
      );

      const tableHeaders = [selectedColumns.map((col) => fieldDict[col]?.label || col)];
      const tableBody = reportRows.map((row) =>
        selectedColumns.map((col) => {
          const val = row[col];
          return val === undefined || val === null || val === "—" ? "-" : String(val);
        })
      );

      autoTable(doc, {
        head: tableHeaders,
        body: tableBody,
        startY: 70,
        styles: {
          fontSize: 8,
          cellPadding: 4,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      doc.save(`HRMS_Custom_Report_${formatLocalDateYMD(new Date())}.pdf`);
      toast.success("PDF report generated successfully.");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF document.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 max-w-7xl mx-auto p-4 md:p-4 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 px-5 md:px-6 pt-4 py-3 md:py-">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <LuTableProperties className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                  Custom Report Builder
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  Ad-Hoc Engine
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Build cross-functional reports combining Employee, Attendance, Leave, and Payroll data with custom exports.
              </p>
            </div>
          </div>

          {/* Quick Presets & Template Actions */}
          <div className="flex flex-col flex-wrap items-end gap-2">
            <div className="relative inline-block text-left">
              <select
                value={isModifiedFromPreset ? "custom_modified" : activePresetId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val || val === "custom_modified") return;
                  const allPresets = [...presets, ...customPresets];
                  const foundPreset = allPresets.find((p) => p.id === val);
                  if (foundPreset) handleApplyPreset(foundPreset);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-300 transition-colors cursor-pointer shadow-xs max-w-xs truncate"
              >
                <optgroup label="System Standard Templates">
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                {customPresets.length > 0 && (
                  <optgroup label="My Saved Custom Templates">
                    {customPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        ⭐ {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {isModifiedFromPreset && (
                  <option value="custom_modified">
                    ✎ {activePresetName ? `${activePresetName} (Modified)` : "Custom Selection"} ({selectedColumns.length} cols)
                  </option>
                )}
              </select>
            </div>

            {/* Active Template Status Pill & Actions */}
            {isModifiedFromPreset ? (
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Modified
                </span>
                {activePresetId.startsWith("custom_") && (
                  <button
                    onClick={handleUpdateActivePreset}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 shadow-xs transition-colors"
                    title="Save current columns into this template"
                  >
                    <LuCheck className="w-3.5 h-3.5" />
                    Update Preset
                  </button>
                )}
              </div>
            ) : activePresetName ? (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hidden sm:inline-block">
                Active: {activePresetName}
              </span>
            ) : null}

            {activePresetId.startsWith("custom_") && (
              <button
                onClick={() => handleDeleteCustomPreset(activePresetId)}
                className="p-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors shadow-xs"
                title={`Delete preset "${activePresetName}"`}
              >
                <LuTrash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                setNewPresetName("");
                setShowSavePresetModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 shadow-xs transition-colors"
              title="Save current column selection as a new template"
            >
              <LuSave className="w-3.5 h-3.5 text-indigo-600" />
              Save As Preset
            </button>
          </div>
        </div>
      </div>

      {/* Column Selection & Configuration Drawer */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2">
            <LuSlidersHorizontal className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Select Fields Across Modules
            </h2>
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {selectedColumns.length} Active Columns
            </span>
          </div>

          {/* Module Filter Tabs & Column Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <LuSearch className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search fields..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 md:w-48 bg-slate-50/50"
              />
            </div>

            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200">
              <button
                onClick={() => setActiveCategoryTab("all")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeCategoryTab === "all" ? "bg-white text-blue-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Modules
              </button>
              {catalog.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => setActiveCategoryTab(cat.category)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
                    activeCategoryTab === cat.category ? "bg-white text-blue-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {cat.category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Categorized Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {catalog
            .filter((cat) => activeCategoryTab === "all" || activeCategoryTab === cat.category)
            .map((cat) => {
              const CatIcon = cat.icon || LuTableProperties;
              const filteredFields = cat.fields.filter(
                (f) =>
                  !fieldSearch.trim() ||
                  f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
                  f.key.toLowerCase().includes(fieldSearch.toLowerCase())
              );

              const selectedInCat = cat.fields.filter((f) => selectedColumns.includes(f.key)).length;
              const allSelected = selectedInCat === cat.fields.length;

              return (
                <div
                  key={cat.category}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg text-white bg-slate-700`}>
                          <CatIcon className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 leading-tight">
                            {cat.categoryLabel}
                          </h3>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {selectedInCat}/{cat.fields.length} selected
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectAllCategory(cat)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {allSelected ? "Clear" : "Select All"}
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {filteredFields.map((f) => {
                        const isChecked = selectedColumns.includes(f.key);
                        return (
                          <label
                            key={f.key}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                              isChecked
                                ? "bg-white text-slate-900 font-semibold shadow-xs border border-blue-200"
                                : "text-slate-600 hover:bg-white/80"
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleColumn(f.key)}
                                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                              />
                              <span className="truncate">{f.label}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                              {f.type}
                            </span>
                          </label>
                        );
                      })}
                      {filteredFields.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic py-3 text-center">
                          No matching fields
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Active Ordered Columns Ribbon & Reordering */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>Column Layout Order (left to right in table & export):</span>
              <span className="text-slate-400 font-normal">Use arrows to rearrange</span>
            </span>
            <button
              onClick={() => setSelectedColumns(["employee_id", "full_name", "dept", "designation"])}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold transition-colors"
            >
              Reset to Minimal
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-200 scrollbar-thin">
            {selectedColumns.map((colKey, index) => {
              const fMeta = fieldDict[colKey] || { label: colKey, category: "misc" };
              return (
                <div
                  key={colKey}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs shadow-xs group"
                >
                  <span className="font-medium text-slate-700">{fMeta.label}</span>
                  <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 pl-1 text-slate-400">
                    <button
                      onClick={() => handleMoveColumn(index, -1)}
                      disabled={index === 0}
                      className="hover:text-blue-600 disabled:opacity-20 cursor-pointer"
                      title="Move column left"
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => handleMoveColumn(index, 1)}
                      disabled={index === selectedColumns.length - 1}
                      className="hover:text-blue-600 disabled:opacity-20 cursor-pointer"
                      title="Move column right"
                    >
                      ▶
                    </button>
                    <button
                      onClick={() => handleToggleColumn(colKey)}
                      className="hover:text-rose-600 ml-0.5 cursor-pointer"
                      title="Remove column"
                    >
                      <LuX className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <LuFilter className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Filter Records & Date Parameters
            </h2>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Quick Dates:</span>
            <button
              onClick={() => setQuickDateRange("this_month")}
              className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickDateRange("last_month")}
              className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Last Month
            </button>
            <button
              onClick={() => setQuickDateRange("quarter")}
              className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              This Quarter
            </button>
            <button
              onClick={() => setQuickDateRange("ytd")}
              className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              YTD
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {filterOptions.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Work Location */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Branch / Location</label>
            <select
              value={workLocation}
              onChange={(e) => setWorkLocation(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {filterOptions.locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
            <select
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {filterOptions.statuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={() => generateReport(true)}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-sm transition-colors"
            >
              <LuRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Compiling..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Ribbon */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <LuUsers className="w-3.5 h-3.5 text-blue-600" /> Total Headcount
            </span>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {summary.totalHeadcount} <span className="text-xs font-normal text-slate-400">staff</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <LuClock className="w-3.5 h-3.5 text-amber-600" /> Avg Attendance
            </span>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {summary.avgAttendanceRate}%
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <LuCalendar className="w-3.5 h-3.5 text-emerald-600" /> Leaves Availed
            </span>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {summary.totalLeavesTaken} <span className="text-xs font-normal text-slate-400">days</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <LuWallet className="w-3.5 h-3.5 text-indigo-600" /> Gross Payroll
            </span>
            <div className="text-xl font-bold text-slate-800 mt-1">
              ₹{Number(summary.totalGrossPayroll || 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs col-span-2 md:col-span-1">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <LuCircleCheck className="w-3.5 h-3.5 text-teal-600" /> Total Net Payout
            </span>
            <div className="text-xl font-bold text-slate-800 mt-1">
              ₹{Number(summary.totalNetPayout || 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      )}

      {/* Report Data Preview Table with Export Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <LuFileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Live Data Preview ({reportRows.length} Records)
              </h3>
              <p className="text-xs text-slate-400">
                Sorted and projected per your column configuration. Click headers to sort.
              </p>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={reportRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-lg border border-emerald-200 transition-colors shadow-xs"
            >
              <LuDownload className="w-3.5 h-3.5" />
              Export Excel (.xlsx)
            </button>

            <button
              onClick={handleExportCSV}
              disabled={reportRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 rounded-lg border border-blue-200 transition-colors shadow-xs"
            >
              <LuFileText className="w-3.5 h-3.5" />
              Export CSV (.csv)
            </button>

            <button
              onClick={handleExportPDF}
              disabled={reportRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 rounded-lg border border-rose-200 transition-colors shadow-xs"
            >
              <LuPrinter className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Interactive Table */}
        <div className="overflow-x-auto max-h-[580px] scrollbar-thin">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center text-slate-400">#</th>
                {selectedColumns.map((colKey) => {
                  const meta = fieldDict[colKey] || { label: colKey, type: "string" };
                  const isSorted = sortField === colKey;
                  return (
                    <th
                      key={colKey}
                      onClick={() => handleSort(colKey)}
                      className="py-3 px-3.5 cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span>{meta.label}</span>
                        <span className="text-slate-400">
                          {isSorted ? (sortAsc ? "▲" : "▼") : "⇅"}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} className="py-16 text-center text-slate-500">
                    <LuRefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="font-medium text-xs">Compiling custom cross-module report...</span>
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} className="py-16 text-center text-slate-500">
                    <LuSlidersHorizontal className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Adjust your date range or filters above and click "Generate Report".
                    </p>
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono font-medium">
                      {idx + 1}
                    </td>
                    {selectedColumns.map((colKey) => {
                      const meta = fieldDict[colKey] || { type: "string" };
                      return (
                        <td key={colKey} className="py-2.5 px-3.5 whitespace-nowrap">
                          {formatCellValue(row[colKey], meta.type)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Custom Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <LuSave className="w-5 h-5 text-indigo-600" /> Save Report Template
              </h3>
              <button
                onClick={() => setShowSavePresetModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Monthly Executive Staffing & Costs"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveCustomPreset()}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Saves current column configuration ({selectedColumns.length} fields) to browser memory for 1-click loading.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSavePresetModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomPreset}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
