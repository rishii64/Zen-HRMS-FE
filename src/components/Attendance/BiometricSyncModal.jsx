import React, { useState, useEffect } from "react";
import { Modal, Row, Col, Badge, Spinner, Form } from "react-bootstrap";
import toast from "react-hot-toast";
import {
  LuFingerprint,
  LuCpu,
  LuUpload,
  LuActivity,
  LuKey,
  LuRefreshCw,
  LuCheck,
  LuCopy,
  LuTrash2,
  LuPlus,
  LuX,
  LuEye,
  LuEyeOff,
  LuCircleCheck,
  LuCircleAlert,
  LuSearch,
  LuCalendar,
  LuDownload,
  LuUser,
  LuArrowRight,
  LuRadio
} from "react-icons/lu";
import * as XLSX from "xlsx";
import { getApiBaseUrl } from "../../api/axios";

const API = getApiBaseUrl();

export default function BiometricSyncModal({
  show,
  onHide,
  onSyncSuccess,
  employees = [],
  selectedDateStr = ""
}) {
  const [activeTab, setActiveTab] = useState("terminals"); // "terminals" | "import" | "punches" | "mapping"
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    todayPunches: 0,
    processedPunches: 0,
    unresolvedPunches: 0,
    lastSyncAt: null,
    lastSyncDevice: "None",
  });

  // Devices State
  const [devices, setDevices] = useState([]);
  const [pingingId, setPingingId] = useState(null);
  const [pingResults, setPingResults] = useState({});
  const [showKeyId, setShowKeyId] = useState(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    device_name: "",
    device_serial: "",
    device_type: "ZKTeco",
    ip_address: "192.168.1.201",
    port: 4370,
    location: "Main Reception",
    sync_mode: "REALTIME_PUSH",
    notes: "",
  });

  // Punches Log State
  const [punches, setPunches] = useState([]);
  const [punchFilterDate, setPunchFilterDate] = useState(selectedDateStr || new Date().toISOString().split("T")[0]);
  const [punchFilterDevice, setPunchFilterDevice] = useState("All");
  const [punchFilterStatus, setPunchFilterStatus] = useState("All");
  const [punchFilterCategory, setPunchFilterCategory] = useState("All");
  const [punchSearch, setPunchSearch] = useState("");
  const [punchPage, setPunchPage] = useState(1);
  const [punchTotal, setPunchTotal] = useState(0);

  // File Import State
  const [importingFile, setImportingFile] = useState(false);
  const [parsedPunches, setParsedPunches] = useState([]);
  const [importFileName, setImportFileName] = useState("");
  const [importTargetDevice, setImportTargetDevice] = useState("");
  const [importResult, setImportResult] = useState(null);

  // Mapping State
  const [mappingMachineId, setMappingMachineId] = useState("");
  const [mappingEmpId, setMappingEmpId] = useState("");
  const [mappingLoading, setMappingLoading] = useState(false);
  const [unresolvedList, setUnresolvedList] = useState([]);

  // Simulate Push State
  const [simEmpId, setSimEmpId] = useState("");
  const [simPunchType, setSimPunchType] = useState("AUTO");
  const [simMode, setSimMode] = useState("FINGERPRINT");
  const [simulating, setSimulating] = useState(false);

  const token = localStorage.getItem("token");

  // Fetch initial data when modal opens
  useEffect(() => {
    if (show) {
      fetchStats();
      fetchDevices();
      fetchPunches();
      fetchUnresolved();
      if (employees.length > 0 && !simEmpId) {
        const first = employees[0].employee_code || employees[0].employee_id;
        setSimEmpId(first);
        setMappingEmpId(first);
      }
    }
  }, [show]);

  // Refetch punches or unresolved when tab changes
  useEffect(() => {
    if (show) {
      if (activeTab === "punches") {
        fetchPunches();
      } else if (activeTab === "mapping") {
        fetchUnresolved();
      }
    }
  }, [punchFilterDate, punchFilterDevice, punchFilterStatus, punchFilterCategory, punchSearch, punchPage, activeTab]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/attendance/biometric/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.warn("Failed to fetch biometric stats:", err.message);
    }
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/attendance/biometric/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
        if (data.devices?.length > 0 && !importTargetDevice) {
          setImportTargetDevice(data.devices[0].id);
        }
      }
    } catch (err) {
      toast.error("Failed to load biometric terminals");
    } finally {
      setLoading(false);
    }
  };

  const fetchPunches = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (punchFilterDate) queryParams.set("date", punchFilterDate);
      if (punchFilterDevice && punchFilterDevice !== "All") queryParams.set("device_id", punchFilterDevice);
      if (punchFilterStatus && punchFilterStatus !== "All") queryParams.set("sync_status", punchFilterStatus);
      if (punchFilterCategory && punchFilterCategory !== "All") queryParams.set("punch_category", punchFilterCategory);
      if (punchSearch.trim()) queryParams.set("search", punchSearch.trim());
      queryParams.set("page", punchPage);
      queryParams.set("limit", 20);

      const res = await fetch(`${API}/attendance/biometric/punches?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPunches(data.punches || []);
        setPunchTotal(data.total || 0);
      }
    } catch (err) {
      console.warn("Failed to load punch logs:", err.message);
    }
  };

  const fetchUnresolved = async () => {
    try {
      const res = await fetch(`${API}/attendance/biometric/punches?sync_status=UNRESOLVED_USER`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const list = data.punches || [];
        setUnresolvedList(list);
        if (!mappingMachineId && list.length > 0) {
          setMappingMachineId(list[0].biometric_user_id);
        }
      }
    } catch (_) {}
  };

  const handleTestPing = async (dev) => {
    try {
      setPingingId(dev.id);
      const res = await fetch(`${API}/attendance/biometric/devices/${dev.id}/test-ping`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPingResults((prev) => ({
          ...prev,
          [dev.id]: { ok: true, latency: data.latencyMs, message: data.message },
        }));
        toast.success(`Ping: ${data.message}`);
        fetchDevices();
        fetchStats();
      } else {
        setPingResults((prev) => ({
          ...prev,
          [dev.id]: { ok: false, message: data.error || "Unreachable" },
        }));
        toast.error(`Ping failed: ${data.error || "Terminal Unreachable"}`);
      }
    } catch (err) {
      toast.error("Ping test failed: network error");
    } finally {
      setPingingId(null);
    }
  };

  const handleRegenerateKey = async (devId) => {
    if (!window.confirm("Regenerate API Key for this device? Old key will be immediately invalidated.")) return;
    try {
      const res = await fetch(`${API}/attendance/biometric/devices/${devId}/regenerate-key`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("API Key regenerated successfully!");
        fetchDevices();
      } else {
        toast.error(data.error || "Failed to regenerate API key");
      }
    } catch (err) {
      toast.error("Error regenerating key");
    }
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    if (!deviceForm.device_name || !deviceForm.device_serial) {
      toast.error("Device Name and Serial Number are required");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API}/attendance/biometric/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deviceForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("New biometric terminal registered!");
        setShowAddDevice(false);
        setDeviceForm({
          device_name: "",
          device_serial: "",
          device_type: "ZKTeco",
          ip_address: "192.168.1.201",
          port: 4370,
          location: "Main Reception",
          sync_mode: "REALTIME_PUSH",
          notes: "",
        });
        fetchDevices();
        fetchStats();
      } else {
        toast.error(data.error || "Failed to register terminal");
      }
    } catch (err) {
      toast.error("Error registering terminal");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete terminal "${name}"?`)) return;
    try {
      const res = await fetch(`${API}/attendance/biometric/devices/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Terminal removed successfully");
        fetchDevices();
        fetchStats();
      } else {
        toast.error(data.error || "Failed to delete terminal");
      }
    } catch (err) {
      toast.error("Error deleting terminal");
    }
  };

  const handleSimulatePush = async () => {
    if (!simEmpId) {
      toast.error("Select an employee to simulate punch");
      return;
    }
    try {
      setSimulating(true);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      const dateStr = selectedDateStr || now.toISOString().split("T")[0];

      const res = await fetch(`${API}/attendance/biometric/punch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          biometric_user_id: simEmpId,
          punch_time: timeStr,
          punch_date: dateStr,
          punch_type: simPunchType,
          verification_type: simMode,
          device_name: "Hardware Simulator (Live Test)",
          device_serial: "SIM-DEV-LIVE",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Biometric punch processed for ${simEmpId}`);
        fetchStats();
        fetchPunches();
        if (onSyncSuccess) onSyncSuccess();
      } else {
        toast.error(data.message || data.error || "Simulation failed");
      }
    } catch (err) {
      toast.error("Error running simulated punch");
    } finally {
      setSimulating(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv") || fileName.endsWith(".txt") || fileName.endsWith(".dat")) {
      reader.onload = (evt) => {
        const text = evt.target.result;
        parseTextLogs(text);
      };
      reader.readAsText(file);
    } else {
      // Excel file
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          parseExcelRows(rows);
        } catch (err) {
          toast.error("Failed to parse Excel file. Please check format.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const parseTextLogs = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed = [];

    for (const line of lines) {
      // Common formats:
      // 1. Tab separated: EnrollmentID \t Timestamp \t State \t Verification
      // 2. Comma separated: EnrollmentID, Timestamp, PunchType, Mode
      const tokens = line.includes("\t")
        ? line.split("\t").map((t) => t.trim())
        : line.split(",").map((t) => t.trim());

      if (tokens.length >= 2) {
        const bioId = tokens[0].replace(/['"]/g, "");
        const rawTime = tokens[1].replace(/['"]/g, "");

        // Skip headers if any
        if (bioId.toLowerCase().includes("id") || bioId.toLowerCase().includes("user")) continue;

        let dateStr = new Date().toISOString().split("T")[0];
        let timeStr = "10:00:00";

        if (rawTime.includes(" ") || rawTime.includes("T")) {
          const parts = rawTime.split(rawTime.includes("T") ? "T" : " ");
          dateStr = parts[0];
          timeStr = parts[1] || timeStr;
        } else if (rawTime.includes(":")) {
          timeStr = rawTime;
        }

        parsed.push({
          biometric_user_id: bioId,
          punch_date: dateStr,
          punch_time: timeStr,
          punch_type: tokens[2] || "AUTO",
          verification_type: tokens[3] || "FINGERPRINT",
        });
      }
    }

    setParsedPunches(parsed);
    if (parsed.length === 0) {
      toast.error("No valid punch rows detected in file. Ensure format is: UserID, YYYY-MM-DD HH:MM:SS");
    } else {
      toast.success(`Parsed ${parsed.length} raw punch logs successfully!`);
    }
  };

  const parseExcelRows = (rows) => {
    const parsed = [];
    for (const row of rows) {
      // Find possible keys case-insensitively
      const getVal = (candidates) => {
        for (const k of Object.keys(row)) {
          if (candidates.some((c) => k.toLowerCase().includes(c))) {
            return String(row[k]).trim();
          }
        }
        return "";
      };

      const bioId = getVal(["user", "enroll", "emp", "id", "badge", "machine"]);
      const dateVal = getVal(["date", "punch_date"]);
      const timeVal = getVal(["time", "punch_time", "stamp", "clock"]);
      const typeVal = getVal(["type", "state", "status", "io"]);
      const modeVal = getVal(["mode", "verify", "verification"]);

      if (bioId) {
        let pDate = dateVal || new Date().toISOString().split("T")[0];
        let pTime = timeVal || "10:00:00";

        if (pDate.includes("T") || pDate.includes(" ")) {
          const parts = pDate.split(pDate.includes("T") ? "T" : " ");
          pDate = parts[0];
          if (!timeVal && parts[1]) pTime = parts[1];
        }

        parsed.push({
          biometric_user_id: bioId,
          punch_date: pDate,
          punch_time: pTime,
          punch_type: typeVal || "AUTO",
          verification_type: modeVal || "FINGERPRINT",
        });
      }
    }

    setParsedPunches(parsed);
    if (parsed.length === 0) {
      toast.error("Could not find matching columns. Columns should contain Employee/UserID, Date, Time.");
    } else {
      toast.success(`Parsed ${parsed.length} punch rows from Excel!`);
    }
  };

  const handleDownloadSampleTemplate = () => {
    const sample = [
      { "Biometric User ID": "EMP-DM-11", "Date": "2026-10-26", "Time": "09:30:00", "Punch Type": "CHECK_IN", "Verification Mode": "FINGERPRINT" },
      { "Biometric User ID": "EMP-DM-11", "Date": "2026-10-26", "Time": "18:45:00", "Punch Type": "CHECK_OUT", "Verification Mode": "FINGERPRINT" },
      { "Biometric User ID": "1002", "Date": "2026-10-26", "Time": "09:40:15", "Punch Type": "AUTO", "Verification Mode": "FACE" },
      { "Biometric User ID": "1003", "Date": "2026-10-26", "Time": "10:05:00", "Punch Type": "AUTO", "Verification Mode": "RFID_CARD" },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Biometric Logs Template");
    XLSX.writeFile(wb, "Biometric_Punch_Logs_Sample.xlsx");
    toast.success("Sample template downloaded!");
  };

  const handleProcessImport = async () => {
    if (parsedPunches.length === 0) {
      toast.error("Please select a file with punch data first");
      return;
    }
    try {
      setImportingFile(true);
      const res = await fetch(`${API}/attendance/biometric/import-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          punches: parsedPunches,
          device_id: importTargetDevice || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data.summary);
        toast.success(data.message || `Successfully synced ${data.summary.processed} punches!`);
        setParsedPunches([]);
        fetchStats();
        fetchPunches();
        if (onSyncSuccess) onSyncSuccess();
      } else {
        toast.error(data.error || "Failed to process imported punches");
      }
    } catch (err) {
      toast.error("Network error during file import");
    } finally {
      setImportingFile(false);
    }
  };

  const handleMapUser = async (e) => {
    e.preventDefault();
    if (!mappingMachineId || !mappingEmpId) {
      toast.error("Both Machine ID and Employee are required");
      return;
    }
    try {
      setMappingLoading(true);
      const res = await fetch(`${API}/attendance/biometric/map-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          biometric_user_id: mappingMachineId,
          employee_id: mappingEmpId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setMappingMachineId("");
        fetchStats();
        fetchPunches();
        fetchUnresolved();
        if (onSyncSuccess) onSyncSuccess();
      } else {
        toast.error(data.error || "Failed to map user");
      }
    } catch (err) {
      toast.error("Error mapping user");
    } finally {
      setMappingLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static" className="biometric-console-modal">
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <LuFingerprint className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h5 className="font-extrabold text-base mb-0 tracking-tight text-white">
                  Biometric Hardware & API Sync Console
                </h5>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Gateway
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-0 font-medium">
                Seamless real-time synchronization between biometric terminals (eSSL, ZKTeco, Hikvision) and employee attendance records
              </p>
            </div>
          </div>
          <button
            onClick={onHide}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* METRICS STRIP */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3">
          <Row className="g-3">
            <Col xs={6} md={3}>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Terminals</div>
                  <div className="text-lg font-black text-slate-800">{stats.totalDevices} Total</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <LuCpu className="w-4 h-4" />
                </div>
              </div>
            </Col>

            <Col xs={6} md={3}>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Online Gateways</div>
                  <div className="text-lg font-black text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {stats.onlineDevices} Online
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <LuRadio className="w-4 h-4" />
                </div>
              </div>
            </Col>

            <Col xs={6} md={3}>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Syncs</div>
                  <div className="text-lg font-black text-indigo-600">{stats.todayPunches} Punches</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <LuActivity className="w-4 h-4" />
                </div>
              </div>
            </Col>

            <Col xs={6} md={3}>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unresolved IDs</div>
                  <div className={`text-lg font-black ${stats.unresolvedPunches > 0 ? "text-rose-600" : "text-slate-600"}`}>
                    {stats.unresolvedPunches} Unmapped
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-lg ${stats.unresolvedPunches > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"} flex items-center justify-center font-bold`}>
                  <LuKey className="w-4 h-4" />
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2">
          <button
            onClick={() => setActiveTab("terminals")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "terminals"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LuCpu className="w-4 h-4" />
            Hardware Terminals & Webhook API
          </button>

          <button
            onClick={() => setActiveTab("import")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "import"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LuUpload className="w-4 h-4" />
            Bulk Log & File Import (.DAT / CSV / Excel)
          </button>

          <button
            onClick={() => setActiveTab("punches")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "punches"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LuActivity className="w-4 h-4" />
            Real-Time Punch Feed & Audit Logs
          </button>

          <button
            onClick={() => setActiveTab("mapping")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "mapping"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LuKey className="w-4 h-4" />
            Machine ID Mapping {stats.unresolvedPunches > 0 && <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">{stats.unresolvedPunches}</span>}
          </button>
        </div>

        {/* TAB 1: TERMINALS & GATEWAYS */}
        {activeTab === "terminals" && (
          <div className="p-6 max-h-[68vh] overflow-y-auto">
            {/* Real-time Webhook Integration Box */}
            <div className="mb-6 p-4 rounded-xl bg-slate-900 text-white border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <LuRadio className="w-4 h-4" />
                  </span>
                  <div>
                    <h6 className="font-extrabold text-sm mb-0 text-white">Biometric Device Ingestion API (Webhook)</h6>
                    <span className="text-[11px] text-slate-400">Push real-time punches directly from eSSL ADMS, ZKTeco Cloud, or custom hardware gateway</span>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(`${API}/attendance/biometric/punch`, "Webhook URL")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors border border-slate-700"
                >
                  <LuCopy className="w-3.5 h-3.5" /> Copy Endpoint URL
                </button>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-xs text-emerald-400 flex items-center justify-between overflow-x-auto border border-slate-800">
                <code>POST {API}/attendance/biometric/punch</code>
                <span className="text-[10px] text-slate-400 ml-4 font-sans font-semibold">Header: x-device-key: YOUR_DEVICE_API_KEY</span>
              </div>
            </div>

            {/* Terminal Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h6 className="font-extrabold text-sm text-slate-800 mb-0">Registered Terminals ({devices.length})</h6>
                <span className="text-xs text-slate-500">Configured biometric access hardware and cloud sync gateways</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDevices}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs"
                >
                  <LuRefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
                <button
                  onClick={() => setShowAddDevice(!showAddDevice)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs ${
                    showAddDevice
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {showAddDevice ? <LuX className="w-4 h-4" /> : <LuPlus className="w-4 h-4" />} {showAddDevice ? "Cancel" : "Add Biometric Device"}
                </button>
              </div>
            </div>

            {/* Add Device Inline Form */}
            {showAddDevice && (
              <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-sm animate-fade-in">
                <h6 className="font-extrabold text-xs uppercase tracking-wider text-slate-600 mb-3">Register New Biometric Hardware Terminal</h6>
                <Form onSubmit={handleCreateDevice}>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Label className="text-xs font-bold text-slate-700">Device Name *</Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        placeholder="e.g. SilkBio 101 Ground Floor"
                        value={deviceForm.device_name}
                        onChange={(e) => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
                        required
                        className="rounded-lg text-xs"
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Label className="text-xs font-bold text-slate-700">Device Serial No *</Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        placeholder="e.g. BIO-ZKT-HQ-03"
                        value={deviceForm.device_serial}
                        onChange={(e) => setDeviceForm({ ...deviceForm, device_serial: e.target.value })}
                        required
                        className="rounded-lg text-xs"
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Label className="text-xs font-bold text-slate-700">Hardware Brand</Form.Label>
                      <Form.Select
                        size="sm"
                        value={deviceForm.device_type}
                        onChange={(e) => setDeviceForm({ ...deviceForm, device_type: e.target.value })}
                        className="rounded-lg text-xs font-bold"
                      >
                        <option value="ZKTeco">ZKTeco</option>
                        <option value="eSSL">eSSL</option>
                        <option value="Hikvision">Hikvision</option>
                        <option value="Matrix">Matrix</option>
                        <option value="Anviz">Anviz</option>
                        <option value="Generic API">Generic API</option>
                      </Form.Select>
                    </Col>
                    <Col md={3}>
                      <Form.Label className="text-xs font-bold text-slate-700">Campus Location</Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        placeholder="e.g. 5th Floor Engineering Lab"
                        value={deviceForm.location}
                        onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
                        className="rounded-lg text-xs"
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Label className="text-xs font-bold text-slate-700">IP Address</Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        placeholder="192.168.1.205"
                        value={deviceForm.ip_address}
                        onChange={(e) => setDeviceForm({ ...deviceForm, ip_address: e.target.value })}
                        className="rounded-lg text-xs"
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Label className="text-xs font-bold text-slate-700">Port</Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        placeholder="4370"
                        value={deviceForm.port}
                        onChange={(e) => setDeviceForm({ ...deviceForm, port: e.target.value })}
                        className="rounded-lg text-xs"
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Label className="text-xs font-bold text-slate-700">Sync Mode</Form.Label>
                      <Form.Select
                        size="sm"
                        value={deviceForm.sync_mode}
                        onChange={(e) => setDeviceForm({ ...deviceForm, sync_mode: e.target.value })}
                        className="rounded-lg text-xs font-bold"
                      >
                        <option value="REALTIME_PUSH">Real-time Cloud Push (Webhook)</option>
                        <option value="POLLING">Automated Socket Polling</option>
                        <option value="FILE_IMPORT">Manual / USB Log Import</option>
                      </Form.Select>
                    </Col>
                    <Col md={3} className="flex items-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        {loading ? <Spinner size="sm" /> : <LuCircleCheck className="w-4 h-4" />} Save Terminal
                      </button>
                    </Col>
                  </Row>
                </Form>
              </div>
            )}

            {/* Devices Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices.map((dev) => {
                const isPinging = pingingId === dev.id;
                const pingRes = pingResults[dev.id];
                const isKeyRevealed = showKeyId === dev.id;

                return (
                  <div key={dev.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{dev.device_name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                              {dev.device_type}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            📍 {dev.location} • SN: {dev.device_serial}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                            dev.status === "ONLINE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dev.status === "ONLINE" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                          {dev.status}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 mb-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-medium text-slate-400 text-[11px]">IP & Socket:</span>
                          <span className="font-mono font-bold text-slate-800">{dev.ip_address}:{dev.port}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-medium text-slate-400 text-[11px]">Punches Synced:</span>
                          <span className="font-bold text-emerald-600">{dev.total_punches_synced || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-medium text-slate-400 text-[11px]">Last Sync:</span>
                          <span className="font-medium text-slate-700">{dev.last_sync_at ? new Date(dev.last_sync_at).toLocaleString() : "Never"}</span>
                        </div>

                        {/* API Key Strip */}
                        <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-400 text-[11px]">API Key:</span>
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">
                              {isKeyRevealed ? dev.api_key : `${dev.api_key.substring(0, 8)}••••••••`}
                            </span>
                            <button
                              onClick={() => setShowKeyId(isKeyRevealed ? null : dev.id)}
                              className="text-slate-400 hover:text-slate-700 p-1 rounded"
                              title={isKeyRevealed ? "Hide Key" : "Show Key"}
                            >
                              {isKeyRevealed ? <LuEyeOff className="w-3.5 h-3.5" /> : <LuEye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(dev.api_key, "API Key")}
                              className="text-slate-400 hover:text-slate-700 p-1 rounded"
                              title="Copy Key"
                            >
                              <LuCopy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {pingRes && (
                        <div className={`p-2 rounded-lg text-xs mb-3 font-semibold ${pingRes.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                          {pingRes.ok ? `✓ Handshake OK (${pingRes.latency}ms latency)` : `✗ Ping Failed: ${pingRes.message}`}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTestPing(dev)}
                          disabled={isPinging}
                          className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {isPinging ? <Spinner size="sm" /> : <LuRadio className="w-3.5 h-3.5 text-blue-600" />}
                          Test Ping
                        </button>
                        <button
                          onClick={() => handleRegenerateKey(dev.id)}
                          className="text-slate-500 hover:text-amber-600 text-[11px] font-bold px-2 py-1.5 rounded hover:bg-amber-50 transition-colors"
                        >
                          Regenerate Key
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteDevice(dev.id, dev.device_name)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition-colors"
                        title="Delete Device"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Live Hardware Simulator */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-emerald-600 text-white">
                    <LuFingerprint className="w-4 h-4" />
                  </span>
                  <div>
                    <h6 className="font-extrabold text-sm text-emerald-950 mb-0">Hardware Punch Push Simulator</h6>
                    <span className="text-xs text-emerald-700">
                      Simulate punches: 1st punch = Entry Time, Last punch = Exit Time, and all intermediate punches are captured for audit records.
                    </span>
                  </div>
                </div>
              </div>

              <Row className="g-2 items-center">
                <Col md={4}>
                  <Form.Select
                    size="sm"
                    value={simEmpId}
                    onChange={(e) => setSimEmpId(e.target.value)}
                    className="text-xs font-bold rounded-lg border-emerald-300"
                  >
                    {employees.map((emp) => {
                      const code = emp.employee_code || emp.employee_id;
                      return (
                        <option key={code} value={code}>
                          {emp.name} ({code})
                        </option>
                      );
                    })}
                  </Form.Select>
                </Col>

                <Col md={3}>
                  <Form.Select
                    size="sm"
                    value={simPunchType}
                    onChange={(e) => setSimPunchType(e.target.value)}
                    className="text-xs font-bold rounded-lg border-emerald-300"
                  >
                    <option value="AUTO">Auto Detect (1st=In, 2nd=Out)</option>
                    <option value="CHECK_IN">Force Check-In</option>
                    <option value="CHECK_OUT">Force Check-Out</option>
                  </Form.Select>
                </Col>

                <Col md={3}>
                  <Form.Select
                    size="sm"
                    value={simMode}
                    onChange={(e) => setSimMode(e.target.value)}
                    className="text-xs font-bold rounded-lg border-emerald-300"
                  >
                    <option value="FINGERPRINT">Fingerprint Sensor</option>
                    <option value="FACE">Facial Recognition AI</option>
                    <option value="RFID_CARD">Smart RFID Card</option>
                  </Form.Select>
                </Col>

                <Col md={2}>
                  <button
                    onClick={handleSimulatePush}
                    disabled={simulating}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    {simulating ? <Spinner size="sm" /> : <LuCircleCheck className="w-3.5 h-3.5" />} Simulate Push
                  </button>
                </Col>
              </Row>
            </div>
          </div>
        )}

        {/* TAB 2: FILE IMPORT */}
        {activeTab === "import" && (
          <div className="p-6 max-h-[68vh] overflow-y-auto">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h6 className="font-extrabold text-sm text-slate-800 mb-0">Biometric Machine Logs & File Sync</h6>
                <span className="text-xs text-slate-500">
                  Import punch files exported from standalone USB devices or ZKTeco / eSSL desktop software (.dat, .csv, .xlsx)
                </span>
              </div>
              <button
                onClick={handleDownloadSampleTemplate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all"
              >
                <LuDownload className="w-4 h-4 text-emerald-600" /> Download Log Template (.xlsx)
              </button>
            </div>

            {/* Drop / Upload Zone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/60 transition-colors mb-5">
              <input
                type="file"
                id="biometric-file-input"
                accept=".csv, .xlsx, .xls, .dat, .txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="biometric-file-input" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <LuUpload className="w-6 h-6" />
                </div>
                <div className="font-extrabold text-sm text-slate-800 mb-1">
                  {importFileName ? `Selected: ${importFileName}` : "Click to select or drag and drop machine log file"}
                </div>
                <div className="text-xs text-slate-400">
                  Supported extensions: <strong>.DAT</strong> (ZKTeco native), <strong>.CSV</strong>, <strong>.XLSX</strong>, <strong>.TXT</strong>
                </div>
              </label>
            </div>

            {/* Parsed Preview Table */}
            {parsedPunches.length > 0 && (
              <div className="mb-5 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                    Parsed Punches Preview ({parsedPunches.length} records detected)
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-semibold">Assign to Terminal:</span>
                    <Form.Select
                      size="sm"
                      value={importTargetDevice}
                      onChange={(e) => setImportTargetDevice(e.target.value)}
                      className="text-xs font-bold rounded-lg max-w-[200px]"
                    >
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>{d.device_name}</option>
                      ))}
                    </Form.Select>
                    <button
                      onClick={handleProcessImport}
                      disabled={importingFile}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all"
                    >
                      {importingFile ? <Spinner size="sm" /> : <LuCircleCheck className="w-4 h-4" />}
                      Sync {parsedPunches.length} Punches to Attendance
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Biometric User / Card ID</th>
                        <th className="py-2 px-3">Punch Date</th>
                        <th className="py-2 px-3">Punch Time</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedPunches.slice(0, 100).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{p.biometric_user_id}</td>
                          <td className="py-2 px-3 text-slate-700">{p.punch_date}</td>
                          <td className="py-2 px-3 font-mono text-emerald-600 font-bold">{p.punch_time}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              {p.punch_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{p.verification_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedPunches.length > 100 && (
                  <div className="text-[11px] text-slate-400 text-right mt-1 font-semibold">
                    Showing first 100 of {parsedPunches.length} punch records
                  </div>
                )}
              </div>
            )}

            {/* Sync Summary Alert */}
            {importResult && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 mb-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2 text-emerald-900 font-extrabold text-sm">
                  <LuCircleCheck className="w-5 h-5 text-emerald-600" /> Bulk Log Sync Completed!
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-emerald-100">
                    <div className="text-slate-400 text-[10px] font-bold uppercase">Total Read</div>
                    <div className="text-base font-black text-slate-800">{importResult.total}</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-100">
                    <div className="text-emerald-500 text-[10px] font-bold uppercase">Processed & Synced</div>
                    <div className="text-base font-black text-emerald-600">{importResult.processed}</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-100">
                    <div className="text-amber-500 text-[10px] font-bold uppercase">Duplicates Skipped</div>
                    <div className="text-base font-black text-amber-600">{importResult.duplicates}</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-100">
                    <div className="text-rose-500 text-[10px] font-bold uppercase">Unresolved IDs</div>
                    <div className="text-base font-black text-rose-600">{importResult.unresolved}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REAL-TIME PUNCH FEED */}
        {activeTab === "punches" && (
          <div className="p-6 max-h-[68vh] overflow-y-auto">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-xs">
                  <LuCalendar className="w-3.5 h-3.5 text-blue-500" />
                  <input
                    type="date"
                    value={punchFilterDate}
                    onChange={(e) => setPunchFilterDate(e.target.value)}
                    className="border-0 bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <Form.Select
                  size="sm"
                  value={punchFilterDevice}
                  onChange={(e) => setPunchFilterDevice(e.target.value)}
                  className="text-xs font-bold rounded-lg border-slate-200 w-auto"
                >
                  <option value="All">All Terminals</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.device_name}</option>
                  ))}
                </Form.Select>

                <Form.Select
                  size="sm"
                  value={punchFilterCategory}
                  onChange={(e) => setPunchFilterCategory(e.target.value)}
                  className="text-xs font-bold rounded-lg border-slate-200 w-auto"
                >
                  <option value="All">All Punch Roles</option>
                  <option value="FIRST_ENTRY">First Entry (Check-In)</option>
                  <option value="LAST_EXIT">Last Exit (Check-Out)</option>
                  <option value="IN_BETWEEN_AUDIT">In-Between Audit Records</option>
                </Form.Select>

                <Form.Select
                  size="sm"
                  value={punchFilterStatus}
                  onChange={(e) => setPunchFilterStatus(e.target.value)}
                  className="text-xs font-bold rounded-lg border-slate-200 w-auto"
                >
                  <option value="All">All Statuses</option>
                  <option value="PROCESSED">PROCESSED</option>
                  <option value="DUPLICATE">DUPLICATE</option>
                  <option value="UNRESOLVED_USER">UNRESOLVED_USER</option>
                  <option value="FAILED">FAILED</option>
                </Form.Select>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <LuSearch className="absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search Machine/Emp ID..."
                    value={punchSearch}
                    onChange={(e) => setPunchSearch(e.target.value)}
                    className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={fetchPunches}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
                  title="Refresh Punch Log"
                >
                  <LuRefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Punches Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Punch ID</th>
                    <th className="py-2.5 px-3">Machine Enrollment ID</th>
                    <th className="py-2.5 px-3">Resolved Employee</th>
                    <th className="py-2.5 px-3">Punch Role</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Punch Mode</th>
                    <th className="py-2.5 px-3">Terminal</th>
                    <th className="py-2.5 px-3">Sync Status</th>
                    <th className="py-2.5 px-3">Attendance ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {punches.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-6 text-slate-400 text-xs">
                        No biometric punch logs found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    punches.map((p) => {
                      const matchedEmp = employees.find(
                        (e) => (e.employee_code || e.employee_id || "").toLowerCase() === (p.employee_id || "").toLowerCase()
                      );

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">#{p.id}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {p.biometric_user_id}
                          </td>
                          <td className="py-2.5 px-3">
                            {p.employee_id ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-extrabold text-[10px] flex items-center justify-center">
                                  {(matchedEmp?.name || p.employee_id).charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">{matchedEmp?.name || p.employee_id}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{p.employee_id}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-rose-500 font-bold text-[11px] flex items-center gap-1">
                                <LuCircleAlert className="w-3 h-3" /> Unmapped Machine ID
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                p.punch_category === "FIRST_ENTRY"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : p.punch_category === "LAST_EXIT"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : p.punch_category === "IN_BETWEEN_AUDIT"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : p.punch_category === "DUPLICATE"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {p.punch_category === "FIRST_ENTRY" && "↓ First Entry"}
                              {p.punch_category === "LAST_EXIT" && "↑ Last Exit"}
                              {p.punch_category === "IN_BETWEEN_AUDIT" && "⏱ Audit Record"}
                              {p.punch_category === "DUPLICATE" && "Duplicate"}
                              {(!p.punch_category || p.punch_category === "UNMAPPED") && "Unmapped"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-slate-600 font-medium">{p.punch_date}</span>{" "}
                            <span className="font-mono font-bold text-emerald-600">{p.punch_time}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {p.verification_type} • {p.punch_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 text-xs font-medium">
                            {p.device_name || "Terminal"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                p.sync_status === "PROCESSED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : p.sync_status === "DUPLICATE"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${p.sync_status === "PROCESSED" ? "bg-emerald-500" : p.sync_status === "DUPLICATE" ? "bg-amber-500" : "bg-rose-500"}`}></span>
                              {p.sync_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {p.attendance_id ? (
                              <span className="text-emerald-700 font-bold">Linked #{p.attendance_id}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / Total count */}
            <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
              <span>Showing {punches.length} of {punchTotal} total punches</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={punchPage <= 1}
                  onClick={() => setPunchPage(punchPage - 1)}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-bold disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="font-bold text-slate-800">Page {punchPage}</span>
                <button
                  disabled={punches.length < 20}
                  onClick={() => setPunchPage(punchPage + 1)}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-bold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MACHINE ID MAPPING */}
        {activeTab === "mapping" && (
          <div className="p-6 max-h-[68vh] overflow-y-auto">
            <div className="mb-4">
              <h6 className="font-extrabold text-sm text-slate-800 mb-0">Biometric Machine ID to Employee Mapping</h6>
              <span className="text-xs text-slate-500">
                Map enrollment IDs from physical terminals (e.g. 101, 1002, or RFID serials) to corporate employee profiles. Past punches will be automatically linked!
              </span>
            </div>

            {/* Map Form Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
              <h6 className="font-extrabold text-xs uppercase tracking-wider text-slate-600 mb-3">Link Machine ID with Employee</h6>
              <Form onSubmit={handleMapUser}>
                <Row className="g-3 items-end">
                  <Col md={4}>
                    <Form.Label className="text-xs font-bold text-slate-700">Machine Enrollment / Card ID *</Form.Label>
                    <Form.Control
                      type="text"
                      size="sm"
                      placeholder="e.g. 101 or MACH-9999"
                      value={mappingMachineId}
                      onChange={(e) => setMappingMachineId(e.target.value)}
                      required
                      className="rounded-lg text-xs font-mono font-bold"
                    />
                  </Col>

                  <Col md={5}>
                    <Form.Label className="text-xs font-bold text-slate-700">Target Employee *</Form.Label>
                    <Form.Select
                      size="sm"
                      value={mappingEmpId}
                      onChange={(e) => setMappingEmpId(e.target.value)}
                      required
                      className="rounded-lg text-xs font-bold"
                    >
                      {employees.map((emp) => {
                        const code = emp.employee_code || emp.employee_id;
                        return (
                          <option key={code} value={code}>
                            {emp.name} ({code}) • {emp.dept || "General"}
                          </option>
                        );
                      })}
                    </Form.Select>
                  </Col>

                  <Col md={3}>
                    <button
                      type="submit"
                      disabled={mappingLoading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {mappingLoading ? <Spinner size="sm" /> : <LuCircleCheck className="w-4 h-4" />}
                      Link & Reprocess Punches
                    </button>
                  </Col>
                </Row>
              </Form>
            </div>

            {/* Unresolved Punches Alert */}
            {(stats.unresolvedPunches > 0 || unresolvedList.length > 0) && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 mb-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
                    <LuCircleAlert className="w-5 h-5" />
                  </span>
                  <div className="flex-1">
                    <h6 className="font-extrabold text-sm text-rose-950 mb-1">
                      {stats.unresolvedPunches || unresolvedList.length} Unmapped Machine Punch(es) Detected
                    </h6>
                    <p className="text-xs text-rose-800 mb-0 font-medium leading-relaxed">
                      Punches arrived with machine enrollment IDs that are not yet mapped to any employee profile. Click any ID below to autofill the form and map it to an employee:
                    </p>
                  </div>
                </div>

                {/* Quick Selection Pills */}
                {unresolvedList.length > 0 && (
                  <div className="pt-2 border-t border-rose-200/80 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wide">
                      Pending Unmapped IDs:
                    </span>
                    {unresolvedList.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setMappingMachineId(p.biometric_user_id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shadow-xs cursor-pointer ${
                          mappingMachineId === p.biometric_user_id
                            ? "bg-rose-700 text-white ring-2 ring-rose-400"
                            : "bg-white text-rose-800 border border-rose-300 hover:bg-rose-100"
                        }`}
                        title={`Click to map ID '${p.biometric_user_id}' (Punched at ${p.punch_time} on ${p.punch_date})`}
                      >
                        <span>⚡ {p.biometric_user_id}</span>
                        <span className="text-[10px] opacity-75 font-sans">({p.punch_time})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Current Mapped Directory */}
            <div>
              <h6 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider mb-2">
                Currently Mapped Employees ({employees.filter((e) => e.biometric_device_id).length})
              </h6>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Employee Name</th>
                      <th className="py-2.5 px-3">Employee Code</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Machine Enrollment ID</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.filter((e) => e.biometric_device_id).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                          No machine IDs mapped yet. Employees can match directly via their Employee Code (e.g. EMP-DM-11) or custom terminal IDs.
                        </td>
                      </tr>
                    ) : (
                      employees
                        .filter((e) => e.biometric_device_id)
                        .map((emp) => (
                          <tr key={emp.employee_id || emp.employee_code} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{emp.name}</td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">{emp.employee_code || emp.employee_id}</td>
                            <td className="py-2.5 px-3 text-slate-600">{emp.dept || "General"}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {emp.biometric_device_id}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => {
                                  setMappingMachineId(emp.biometric_device_id || "");
                                  setMappingEmpId(emp.employee_code || emp.employee_id || "");
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                              >
                                Edit
                              </button>
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

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Real-time polling & sync active • Gateway latency: ~24ms</span>
          </div>
          <button
            onClick={onHide}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
