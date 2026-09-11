import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
const API = process.env.REACT_APP_API_URL || "http://localhost:5007/api";

// ====================== NOTIFICATION SOUND (Web Audio API) ======================
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Pleasant 3-tone chime
    const tones = [523.25, 659.25, 783.99]; // C5, E5, G5
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (e) {
    console.log("Audio not supported:", e);
  }
};

// ====================== BROWSER PUSH NOTIFICATION ======================
const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
};

const showBrowserNotification = (title, body, icon = "🎯") => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "hr-notification",
      requireInteraction: false,
    });
  }
};

// ====================== TOAST NOTIFICATION COMPONENT ======================
const ToastContainer = ({ toasts, onRemove }) => (
  <div
    style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      maxWidth: 360,
    }}
  >
    {toasts.map((toast) => (
      <div
        key={toast.id}
        style={{
          background:
            toast.type === "success"
              ? "#fff"
              : toast.type === "error"
                ? "#fff"
                : "#fff",
          border: `1px solid ${toast.type === "success" ? "#C0DD97" : toast.type === "error" ? "#F7C1C1" : "#B5D4F4"}`,
          borderLeft: `4px solid ${toast.type === "success" ? "#27500A" : toast.type === "error" ? "#E24B4A" : "#1a73e8"}`,
          borderRadius: 10,
          padding: "14px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          animation: "slideIn 0.3s ease",
          cursor: "pointer",
          minWidth: 280,
        }}
        onClick={() => onRemove(toast.id)}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>
          {toast.type === "success"
            ? "✅"
            : toast.type === "error"
              ? "❌"
              : "ℹ️"}
        </span>
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "#1a1a1a",
            }}
          >
            {toast.title}
          </p>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 12,
              color: "#5f6368",
              lineHeight: 1.4,
            }}
          >
            {toast.message}
          </p>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9aa0a6",
            fontSize: 16,
            padding: 0,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    ))}
    <style>{`
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `}</style>
  </div>
);

// ====================== MAIN COMPONENT ======================
const EmployeeForm = () => {
  const navigate = useNavigate();
  const [department, setDepartment] = useState("");
  const [dateOfHiring, setDateOfHiring] = useState("");
  const [experience, setExperience] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [cycle, setCycle] = useState("Monthly");
  const [newDesig, setNewDesig] = useState("");
  const [designations, setDesignations] = useState([]);
  const [jobRole, setJobRole] = useState("Full-time");

  const [selectedDesig, setSelectedDesig] = useState("");
  const [employees, setEmployees] = useState([]);
  const [salary, setSalary] = useState({ basic: "", hra: "", allowance: "" });

  const [hrName, setHrName] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [hrJoiningDate, setHrJoiningDate] = useState("");
  const [hrList, setHrList] = useState([]);

  const [cvDesig, setCvDesig] = useState("");
  const [cvList, setCvList] = useState([]);
  const [discussNote, setDiscussNote] = useState("");
  const [selectedCvId, setSelectedCvId] = useState(null);
  const [cvTab, setCvTab] = useState("all");

  const [interviews, setInterviews] = useState([]);
  const [interviewForm, setInterviewForm] = useState({
    candidateName: "",
    designation: "",
    department: "",
    dateOfInterview: "",
    timeOfInterview: "",
    remarks: "",
    remarksRequired: "Yes",
    status: "Scheduled",
  });
  const [interviewTab, setInterviewTab] = useState("all");
  const [editingInterviewId, setEditingInterviewId] = useState(null);

  const [activeTab, setActiveTab] = useState("form");
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [recordDetail, setRecordDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ✅ NEW — Notification states
  const [toasts, setToasts] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(null); // hr id currently sending
  const [notifPermission, setNotifPermission] = useState(
    "Notification" in window ? Notification.permission : "denied",
  );
  const toastIdRef = useRef(0);

  // ====================== TOAST HELPERS ======================
  const addToast = useCallback((type, title, message, duration = 5000) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    playNotificationSound();
    showBrowserNotification(title, message);
    if (duration > 0) {
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        duration,
      );
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ====================== REQUEST NOTIFICATION PERMISSION ON MOUNT ======================
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      requestNotificationPermission().then((granted) => {
        setNotifPermission(granted ? "granted" : "denied");
      });
    }
  }, []);

  // ====================== SEND EMAIL TO HR ======================
  const sendHrEmail = async (hr) => {
    setSendingEmail(hr.id);
    try {
      const res = await fetch(`${API}/recruitment/notify-hr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hrEmail: hr.email,
          hrName: hr.name,
          department,
          recruitmentId: "DRAFT",
          designations,
          dateOfHiring,
          jobRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          "success",
          "📧 Email Sent!",
          `Notification sent to ${hr.name} (${hr.email})`,
        );
        // Mark HR as notified
        setHrList((prev) =>
          prev.map((h) =>
            h.id === hr.id
              ? {
                ...h,
                notified: true,
                notifiedAt: new Date().toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }
              : h,
          ),
        );
      } else {
        addToast(
          "error",
          "Email Failed",
          data.message || "Could not send email. Check backend config.",
        );
      }
    } catch (err) {
      addToast(
        "error",
        "Server Error",
        "Backend is not running or email config missing.",
      );
    } finally {
      setSendingEmail(null);
    }
  };

  // ====================== ENABLE NOTIFICATIONS BUTTON ======================
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? "granted" : "denied");
    if (granted) {
      addToast(
        "success",
        "🔔 Notifications Enabled",
        "You will now receive browser notifications.",
      );
    }
  };

  const salaryTotal =
    (parseFloat(salary.basic) || 0) +
    (parseFloat(salary.hra) || 0) +
    (parseFloat(salary.allowance) || 0);

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const allocated = designations.reduce(
    (s, d) => s + (parseFloat(d.salary) || 0),
    0,
  );
  const remaining = (parseFloat(totalBudget) || 0) - allocated;

  const displayDate = (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr).trim().split("T")[0];
    if (!str || str === "null") return null;
    const [y, m, d] = str.split("-");
    if (!y || !m || !d) return null;
    return `${d}/${m}/${y}`;
  };

  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const res = await fetch(`${API}/recruitment/all`);
      const data = await res.json();
      if (data.success) setRecords(data.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const fetchDetail = async (id) => {
    if (expandedRecord === id) {
      setExpandedRecord(null);
      setRecordDetail(null);
      return;
    }
    setExpandedRecord(id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/recruitment/${id}`);
      const data = await res.json();
      if (data.success) setRecordDetail(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (activeTab === "records") fetchRecords();
  }, [activeTab]);

  const addDesignation = () => {
    if (!newDesig.trim()) return;
    setDesignations([
      ...designations,
      { title: newDesig.trim(), minQual: "", salary: "" },
    ]);
    setNewDesig("");
  };
  const updateDesig = (index, field, value) => {
    const updated = [...designations];
    updated[index][field] = value;
    setDesignations(updated);
  };
  const removeDesig = (index) =>
    setDesignations(designations.filter((_, i) => i !== index));
  const handleSalaryChange = (e) =>
    setSalary({ ...salary, [e.target.name]: e.target.value });

  const addEmployee = () => {
    if (!selectedDesig) {
      alert("Please select a designation.");
      return;
    }
    if (salaryTotal === 0) {
      alert("Please enter salary details.");
      return;
    }
    setEmployees([
      ...employees,
      {
        designation: selectedDesig,
        salary: { ...salary, total: salaryTotal },
        id: Date.now(),
      },
    ]);
    setSalary({ basic: "", hra: "", allowance: "" });
    setSelectedDesig("");
  };
  const removeEmployee = (id) =>
    setEmployees(employees.filter((e) => e.id !== id));

  const addHr = () => {
    if (!hrName.trim()) {
      alert("Please enter HR manager name.");
      return;
    }
    if (!hrEmail.trim()) {
      alert("Please enter HR manager email.");
      return;
    }
    const joiningDate =
      hrJoiningDate && hrJoiningDate.trim() !== ""
        ? hrJoiningDate.trim()
        : null;
    const newHr = {
      name: hrName.trim(),
      email: hrEmail.trim(),
      tentativeJoiningDate: joiningDate,
      id: Date.now(),
      notified: false,
      notifiedAt: null,
    };
    setHrList([...hrList, newHr]);
    setHrName("");
    setHrEmail("");
    setHrJoiningDate("");

    // ✅ Auto-send email notification when HR is added
    setTimeout(() => sendHrEmail(newHr), 100);
  };
  const removeHr = (id) => setHrList(hrList.filter((h) => h.id !== id));

  const handleCvUpload = (e) => {
    if (!cvDesig) {
      alert("Please select a designation for this CV.");
      return;
    }
    const files = Array.from(e.target.files);
    const newCvs = files.map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name,
      designation: cvDesig,
      status: "Pending",
      shortlisted: false,
      notes: [],
      uploadedAt: new Date().toLocaleDateString("en-IN"),
    }));
    setCvList([...cvList, ...newCvs]);
    e.target.value = "";
  };
  const updateCvStatus = (id, status) =>
    setCvList(cvList.map((cv) => (cv.id === id ? { ...cv, status } : cv)));
  const toggleShortlist = (id) =>
    setCvList(
      cvList.map((cv) => {
        if (cv.id !== id) return cv;
        const nowShortlisted = !cv.shortlisted;
        return {
          ...cv,
          shortlisted: nowShortlisted,
          status: nowShortlisted ? "Shortlisted" : "Pending",
        };
      }),
    );
  const addNote = (id) => {
    if (!discussNote.trim()) return;
    setCvList(
      cvList.map((cv) =>
        cv.id === id
          ? {
            ...cv,
            notes: [
              ...cv.notes,
              {
                text: discussNote.trim(),
                by: "HR",
                time: new Date().toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ],
          }
          : cv,
      ),
    );
    setDiscussNote("");
    setSelectedCvId(null);
  };
  const removeCv = (id) => setCvList(cvList.filter((cv) => cv.id !== id));

  const handleInterviewChange = (e) => {
    const { name, value } = e.target;
    setInterviewForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleInterviewDesigChange = (e) => {
    setInterviewForm((prev) => ({
      ...prev,
      designation: e.target.value,
      candidateName: "",
    }));
  };
  const addInterview = () => {
    if (!interviewForm.candidateName.trim()) {
      alert("Please enter candidate name.");
      return;
    }
    if (!interviewForm.dateOfInterview) {
      alert("Please enter date of interview.");
      return;
    }
    if (
      interviewForm.remarksRequired === "Yes" &&
      !interviewForm.remarks.trim()
    ) {
      alert("Remarks are required.");
      return;
    }
    if (editingInterviewId !== null) {
      setInterviews(
        interviews.map((iv) =>
          iv.id === editingInterviewId
            ? { ...interviewForm, id: editingInterviewId }
            : iv,
        ),
      );
      setEditingInterviewId(null);
    } else {
      setInterviews([...interviews, { ...interviewForm, id: Date.now() }]);
    }
    setInterviewForm({
      candidateName: "",
      designation: "",
      department: "",
      dateOfInterview: "",
      timeOfInterview: "",
      remarks: "",
      remarksRequired: "Yes",
      status: "Scheduled",
    });
  };
  const editInterview = (iv) => {
    setInterviewForm({ ...iv });
    setEditingInterviewId(iv.id);
  };
  const cancelEditInterview = () => {
    setEditingInterviewId(null);
    setInterviewForm({
      candidateName: "",
      designation: "",
      department: "",
      dateOfInterview: "",
      timeOfInterview: "",
      remarks: "",
      remarksRequired: "Yes",
      status: "Scheduled",
    });
  };
  const removeInterview = (id) => {
    setInterviews(interviews.filter((iv) => iv.id !== id));
    if (editingInterviewId === id) cancelEditInterview();
  };
  const updateInterviewStatus = (id, status) =>
    setInterviews(
      interviews.map((iv) => (iv.id === id ? { ...iv, status } : iv)),
    );

  const handleSubmit = async () => {
    if (!totalBudget) {
      alert("Please enter the recruitment budget.");
      return;
    }
    if (designations.length === 0) {
      alert("Please add at least one designation.");
      return;
    }
    try {
      const res = await fetch(`${API}/recruitment/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department,
          dateOfHiring,
          experience,
          totalBudget,
          cycle,
          jobRole,
          designations,
          hrList: hrList.map((hr) => ({
            name: hr.name,
            email: hr.email,
            tentativeJoiningDate: hr.tentativeJoiningDate || null,
          })),
          interviews,
          employees,
          cvList,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          "success",
          "✅ Saved Successfully!",
          `Recruitment entry saved. ID: #${data.id}`,
        );
        setActiveTab("records");
      } else {
        addToast("error", "Save Failed", data.message || "Unknown error");
      }
    } catch (err) {
      addToast("error", "Server Error", "Check if the backend is running.");
    }
  };

  const statusColor = (status) => {
    if (["Approved", "Shortlisted", "Selected", "Completed"].includes(status))
      return {
        background: "#EAF3DE",
        color: "#27500A",
        border: "0.5px solid #C0DD97",
      };
    if (["Rejected", "Not Selected", "Cancelled"].includes(status))
      return {
        background: "#FCEBEB",
        color: "#791F1F",
        border: "0.5px solid #F7C1C1",
      };
    if (status === "On Hold")
      return {
        background: "#EEEDFE",
        color: "#3C3489",
        border: "0.5px solid #AFA9EC",
      };
    return {
      background: "#FAEEDA",
      color: "#633806",
      border: "0.5px solid #FAC775",
    };
  };

  const shortCount = cvList.filter((c) => c.shortlisted).length;
  const filteredCv =
    cvTab === "shortlisted" ? cvList.filter((c) => c.shortlisted) : cvList;
  const interviewStatusList = [
    "Scheduled",
    "Completed",
    "Selected",
    "Not Selected",
    "On Hold",
    "Cancelled",
  ];
  const filteredInterviews =
    interviewTab === "all"
      ? interviews
      : interviews.filter((iv) => iv.status === interviewTab);
  const cvCandidates = interviewForm.designation
    ? cvList.filter((cv) => cv.designation === interviewForm.designation)
    : [];

  const getHrJoiningDate = (hr) => {
    const raw = hr.tentativeJoiningDate || hr.tentative_joining_date || null;
    if (!raw || raw === "null") return null;
    return String(raw).split("T")[0];
  };

  return (
    <div style={s.wrap}>
      {/* ✅ TOAST NOTIFICATIONS */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ✅ NOTIFICATION PERMISSION BANNER */}
      {notifPermission !== "granted" && (
        <div style={s.notifBanner}>
          <span style={{ fontSize: 14 }}>🔔</span>
          <span style={{ fontSize: 13, color: "#633806", flex: 1 }}>
            Browser notifications are{" "}
            <strong>
              {notifPermission === "denied" ? "blocked" : "not enabled"}
            </strong>
            . Enable to get alerts when HR emails are sent.
          </span>
          {notifPermission !== "denied" && (
            <button
              style={s.notifBannerBtn}
              onClick={handleEnableNotifications}
            >
              Enable Notifications
            </button>
          )}
        </div>
      )}

      {/* ══════════════════ RECORDS VIEW ══════════════════ */}
      {activeTab === "records" && (
        <div style={s.card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                ...s.sectionTitle,
                marginBottom: 0,
                borderBottom: "none",
              }}
            >
              Saved Recruitment Records
            </h2>
            <button
              style={{ ...s.addBtn, marginTop: 0, fontSize: 12 }}
              onClick={fetchRecords}
            >
              ↻ Refresh
            </button>
          </div>

          {loadingRecords ? (
            <p style={s.emptyHint}>Loading records...</p>
          ) : records.length === 0 ? (
            <p style={s.emptyHint}>No records saved yet.</p>
          ) : (
            records.map((rec) => (
              <div key={rec.id} style={s.recordCard}>
                <div style={s.recordHeader} onClick={() => fetchDetail(rec.id)}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={s.recordId}>#{rec.id}</span>
                      <span style={s.recordDept}>{rec.department || "—"}</span>
                      <span
                        style={{
                          ...s.badge,
                          background: "#EAF3DE",
                          color: "#27500A",
                          border: "0.5px solid #C0DD97",
                        }}
                      >
                        {rec.job_role}
                      </span>
                      <span style={s.badge}>{rec.cycle}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        marginTop: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={s.recordMeta}>
                        💰 Budget: <strong>{fmt(rec.total_budget)}</strong>
                      </span>
                      {rec.date_of_hiring && (
                        <span style={s.recordMeta}>
                          📅 {rec.date_of_hiring}
                        </span>
                      )}
                      {rec.experience && (
                        <span style={s.recordMeta}>🎓 {rec.experience}</span>
                      )}
                      <span style={s.recordMeta}>
                        🕒 {new Date(rec.created_at).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <span style={s.expandArrow}>
                    {expandedRecord === rec.id ? "▲" : "▼"}
                  </span>
                </div>

                {expandedRecord === rec.id && (
                  <div style={s.recordDetail}>
                    {loadingDetail ? (
                      <p style={s.emptyHint}>Loading details...</p>
                    ) : (
                      recordDetail && (
                        <>
                          {recordDetail.designations?.length > 0 && (
                            <div style={s.detailSection}>
                              <p style={s.detailTitle}>
                                🏷 Designations (
                                {recordDetail.designations.length})
                              </p>
                              <div
                                style={{
                                  ...s.colHdr,
                                  gridTemplateColumns: "1fr 1fr 1fr",
                                }}
                              >
                                <span style={s.colLabel}>Title</span>
                                <span style={s.colLabel}>
                                  Min. Qualification
                                </span>
                                <span style={s.colLabel}>Salary/Month</span>
                              </div>
                              {recordDetail.designations.map((d) => (
                                <div
                                  key={d.id}
                                  style={{
                                    ...s.desigItem,
                                    gridTemplateColumns: "1fr 1fr 1fr",
                                  }}
                                >
                                  <span style={{ fontSize: 13 }}>
                                    {d.title}
                                  </span>
                                  <span
                                    style={{ fontSize: 13, color: "#5f6368" }}
                                  >
                                    {d.min_qual || "—"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 13,
                                      color: "#185FA5",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {fmt(d.salary)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {recordDetail.hrList?.length > 0 && (
                            <div style={s.detailSection}>
                              <p style={s.detailTitle}>
                                👤 HR Managers ({recordDetail.hrList.length})
                              </p>
                              {recordDetail.hrList.map((hr) => (
                                <div key={hr.id} style={s.hrRow}>
                                  <div style={s.hrAvatar}>
                                    {hr.name
                                      .split(" ")
                                      .map((w) => w[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <p style={s.hrName}>{hr.name}</p>
                                    <p style={s.hrEmailStyle}>{hr.email}</p>
                                    {getHrJoiningDate(hr) ? (
                                      <p
                                        style={{
                                          fontSize: 11,
                                          color: "#185FA5",
                                          margin: "2px 0 6px",
                                        }}
                                      >
                                        📅 Tentative Joining:{" "}
                                        <strong>
                                          {displayDate(getHrJoiningDate(hr))}
                                        </strong>
                                      </p>
                                    ) : (
                                      <p
                                        style={{
                                          fontSize: 11,
                                          color: "#9aa0a6",
                                          margin: "2px 0 6px",
                                        }}
                                      >
                                        📅 Tentative Joining: <em>Not set</em>
                                      </p>
                                    )}
                                    <div style={s.ivInHrBox}>
                                      <p style={s.ivInHrLabel}>
                                        SCHEDULED INTERVIEWS{" "}
                                        <span style={s.newBadge}>NEW</span>
                                      </p>
                                      {recordDetail.interviews?.length > 0 ? (
                                        recordDetail.interviews.map((iv) => (
                                          <div key={iv.id} style={s.ivInHrItem}>
                                            <div style={{ flex: 1 }}>
                                              <p style={s.ivInHrName}>
                                                {iv.candidate_name}
                                              </p>
                                              <p style={s.ivInHrMeta}>
                                                {[
                                                  iv.designation,
                                                  iv.department,
                                                  iv.date_of_interview,
                                                  iv.time_of_interview
                                                    ? `at ${iv.time_of_interview}`
                                                    : "",
                                                ]
                                                  .filter(Boolean)
                                                  .join(" · ")}
                                              </p>
                                            </div>
                                            <span
                                              style={{
                                                ...s.statusPill,
                                                ...statusColor(iv.status),
                                                fontSize: 10,
                                              }}
                                            >
                                              {iv.status}
                                            </span>
                                          </div>
                                        ))
                                      ) : (
                                        <p style={s.ivInHrEmpty}>
                                          No interviews scheduled yet.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span style={s.accessBadge}>
                                    Access Granted
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {recordDetail.cvList?.length > 0 && (
                            <div style={s.detailSection}>
                              <p style={s.detailTitle}>
                                📄 CV Uploads ({recordDetail.cvList.length})
                                &nbsp;
                                <span
                                  style={{
                                    ...s.badge,
                                    background: "#EEEDFE",
                                    color: "#3C3489",
                                    border: "0.5px solid #AFA9EC",
                                  }}
                                >
                                  {
                                    recordDetail.cvList.filter(
                                      (c) => c.shortlisted,
                                    ).length
                                  }{" "}
                                  Shortlisted
                                </span>
                              </p>
                              {recordDetail.cvList.map((cv) => (
                                <div
                                  key={cv.id}
                                  style={{
                                    ...s.cvCard,
                                    ...(cv.shortlisted
                                      ? s.cvCardShortlisted
                                      : {}),
                                    marginBottom: 8,
                                  }}
                                >
                                  <div style={s.cvTop}>
                                    <div style={{ flex: 1 }}>
                                      <p style={s.cvName}>{cv.file_name}</p>
                                      <p style={s.cvMeta}>
                                        {cv.designation} · {cv.uploaded_at}
                                      </p>
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: 6,
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <span
                                        style={{
                                          ...s.statusPill,
                                          ...statusColor(cv.status),
                                        }}
                                      >
                                        {cv.status}
                                      </span>
                                      {cv.shortlisted && (
                                        <span
                                          style={{
                                            ...s.statusPill,
                                            background: "#3C3489",
                                            color: "#fff",
                                            border: "0.5px solid #3C3489",
                                          }}
                                        >
                                          ★ Shortlisted
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {cv.notes?.length > 0 && (
                                    <div style={s.noteList}>
                                      {cv.notes.map((n, i) => (
                                        <div key={i} style={s.noteItem}>
                                          <span style={s.noteBy}>{n.by}</span>
                                          <span style={s.noteText}>
                                            {n.text}
                                          </span>
                                          <span style={s.noteTime}>
                                            {n.time}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {recordDetail.interviews?.length > 0 && (
                            <div style={s.detailSection}>
                              <p style={s.detailTitle}>
                                🎙 Interviews ({recordDetail.interviews.length})
                              </p>
                              {recordDetail.interviews.map((iv) => (
                                <div key={iv.id} style={s.interviewCard}>
                                  <div style={s.cvTop}>
                                    <div style={{ flex: 1 }}>
                                      <p style={s.cvName}>
                                        {iv.candidate_name}
                                      </p>
                                      <p style={s.cvMeta}>
                                        {iv.designation && (
                                          <>{iv.designation}</>
                                        )}
                                        {iv.department
                                          ? ` · ${iv.department}`
                                          : ""}
                                        {iv.date_of_interview
                                          ? ` · ${iv.date_of_interview}`
                                          : ""}
                                        {iv.time_of_interview
                                          ? ` at ${iv.time_of_interview}`
                                          : ""}
                                      </p>
                                    </div>
                                    <span
                                      style={{
                                        ...s.statusPill,
                                        ...statusColor(iv.status),
                                      }}
                                    >
                                      {iv.status}
                                    </span>
                                  </div>
                                  <div style={s.remarksBox}>
                                    <span style={s.remarksLabel}>
                                      Remarks &nbsp;
                                      {iv.remarks_required === "Yes" ? (
                                        <span
                                          style={{
                                            ...s.statusPill,
                                            ...statusColor("Scheduled"),
                                            fontSize: 10,
                                            padding: "1px 6px",
                                          }}
                                        >
                                          Required
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            ...s.statusPill,
                                            background: "#f1f3f4",
                                            color: "#5f6368",
                                            border: "0.5px solid #dadce0",
                                            fontSize: 10,
                                            padding: "1px 6px",
                                          }}
                                        >
                                          Optional
                                        </span>
                                      )}
                                    </span>
                                    <p style={s.remarksText}>
                                      {iv.remarks || (
                                        <span
                                          style={{
                                            color: "#9aa0a6",
                                            fontStyle: "italic",
                                          }}
                                        >
                                          No remarks added.
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {recordDetail.employees?.length > 0 && (
                            <div style={s.detailSection}>
                              <p style={s.detailTitle}>
                                👥 Salary Structure (
                                {recordDetail.employees.length})
                              </p>
                              {recordDetail.employees.map((emp) => (
                                <div key={emp.id} style={s.empDetailCard}>
                                  <div style={s.empCardHeader}>
                                    <p style={s.cvName}>{emp.designation}</p>
                                    <span
                                      style={{
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: "#185FA5",
                                      }}
                                    >
                                      {fmt(emp.total_salary)}
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 400,
                                          color: "#5f6368",
                                        }}
                                      >
                                        /mo
                                      </span>
                                    </span>
                                  </div>
                                  <div style={s.salaryBreakdown}>
                                    <span style={s.salBreakItem}>
                                      Basic:{" "}
                                      <strong>{fmt(emp.basic_salary)}</strong>
                                    </span>
                                    <span style={s.salBreakItem}>
                                      HRA: <strong>{fmt(emp.hra)}</strong>
                                    </span>
                                    <span style={s.salBreakItem}>
                                      Allowance:{" "}
                                      <strong>{fmt(emp.allowance)}</strong>
                                    </span>
                                    <span
                                      style={{
                                        ...s.salBreakItem,
                                        color: "#0C447C",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Total:{" "}
                                      <strong>{fmt(emp.total_salary)}</strong>
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!recordDetail.designations?.length &&
                            !recordDetail.interviews?.length &&
                            !recordDetail.employees?.length &&
                            !recordDetail.cvList?.length && (
                              <p style={s.emptyHint}>
                                No detail data found for this record.
                              </p>
                            )}
                        </>
                      )
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ══════════════════ FORM VIEW ══════════════════ */}
      {activeTab === "form" && (
        <>
          {/* Recruitment Process Details */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                ...s.sectionTitle,
                marginBottom: 0,
                borderBottom: "none",
              }}
            >
              Saved Recruitment Records
            </h2>

            <div style={{ display: "flex", gap: 10 }}>
              {/* 🎯 NEW BUTTON */}
              <button
                style={{
                  ...s.addBtn,
                  background: "#1a73e8",
                  color: "#fff",
                  fontSize: 12,
                  marginTop: 0,
                }}
                onClick={() => navigate("/interview")}
              >
                🎯 Interview Process
              </button>
            </div>
          </div>

          {/* Recruitment Budget */}
          <div style={s.card}>
            <h2 style={s.sectionTitle}>
              Recruitment Budget <span style={s.badge}>{cycle}</span>
            </h2>
            <div style={s.row}>
              <div style={{ ...s.field, flex: 1 }}>
                <label style={s.label}>Total Recruitment Budget (₹)</label>
                <input
                  style={s.input}
                  type="number"
                  placeholder="e.g. 500000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                />
              </div>
            </div>
            {totalBudget && (
              <div
                style={{
                  ...s.budgetBar,
                  ...(remaining < 0 ? s.budgetOver : {}),
                }}
              >
                <span style={remaining < 0 ? s.budgetTextOver : s.budgetText}>
                  Allocated: <strong>{fmt(allocated)}</strong> &nbsp;|&nbsp;
                  Remaining: <strong>{fmt(remaining)}</strong> &nbsp;|&nbsp;
                  Budget: <strong>{fmt(totalBudget)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Designations */}
          <div style={s.card}>
            <h2 style={s.sectionTitle}>Designations</h2>
            <div style={s.row}>
              <div style={{ ...s.field, flex: 1 }}>
                <label style={s.label}>Add Designation</label>
                <input
                  style={s.input}
                  placeholder="e.g. Software Engineer"
                  value={newDesig}
                  onChange={(e) => setNewDesig(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDesignation()}
                />
              </div>
              <button style={s.addBtn} onClick={addDesignation}>
                + Add
              </button>
            </div>
            {designations.length === 0 ? (
              <p style={s.emptyHint}>No designations added yet.</p>
            ) : (
              <div style={{ marginTop: 12 }}>
                <div style={s.colHdr}>
                  <span style={s.colLabel}>Designation</span>
                  <span style={s.colLabel}>Min. Qualification</span>
                  <span style={s.colLabel}>Salary / Month (₹)</span>
                  <span />
                </div>
                {designations.map((d, i) => (
                  <div key={i} style={s.desigItem}>
                    <input
                      style={s.smInput}
                      value={d.title}
                      onChange={(e) => updateDesig(i, "title", e.target.value)}
                    />
                    <input
                      style={s.smInput}
                      value={d.minQual}
                      placeholder="e.g. B.Tech"
                      onChange={(e) =>
                        updateDesig(i, "minQual", e.target.value)
                      }
                    />
                    <input
                      style={s.smInput}
                      type="number"
                      value={d.salary}
                      placeholder="e.g. 60000"
                      onChange={(e) => updateDesig(i, "salary", e.target.value)}
                    />
                    <button style={s.removeBtn} onClick={() => removeDesig(i)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Other Details */}
          <div style={s.card}>
            <h2 style={s.sectionTitle}>Other Details</h2>
            <div style={{ maxWidth: 280 }}>
              <div style={s.field}>
                <label style={s.label}>Job Role Type</label>
                <select
                  style={s.input}
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Intern</option>
                </select>
              </div>
            </div>
          </div>

          {/* ✅ HR Manager Access — WITH EMAIL NOTIFICATION */}
          <div style={s.card}>
            <h2 style={s.sectionTitle}>
              HR Manager Access
              {hrList.length > 0 && (
                <span style={s.badge}>{hrList.length} added</span>
              )}
              <span
                style={{
                  ...s.badge,
                  background: "#EAF3DE",
                  color: "#27500A",
                  border: "0.5px solid #C0DD97",
                  fontSize: 11,
                }}
              >
                📧 Auto Email on Add
              </span>
            </h2>

            <div style={s.grid}>
              <div style={s.field}>
                <label style={s.label}>HR Manager Name</label>
                <input
                  style={s.input}
                  placeholder="Enter name"
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>HR Manager Email</label>
                <input
                  style={s.input}
                  type="email"
                  placeholder="hr@company.com"
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Tentative Joining Date</label>
                <input
                  style={s.input}
                  type="date"
                  value={hrJoiningDate}
                  onChange={(e) => setHrJoiningDate(e.target.value)}
                />
              </div>
            </div>
            <button style={s.addBtn} onClick={addHr}>
              + Give Access & Send Email
            </button>

            {hrList.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {hrList.map((hr) => (
                  <div key={hr.id} style={s.hrRow}>
                    <div style={s.hrAvatar}>
                      {hr.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={s.hrName}>{hr.name}</p>
                      <p style={s.hrEmailStyle}>{hr.email}</p>
                      {hr.tentativeJoiningDate ? (
                        <p
                          style={{
                            fontSize: 11,
                            color: "#185FA5",
                            margin: "2px 0 4px",
                          }}
                        >
                          📅 Tentative Joining:{" "}
                          <strong>
                            {displayDate(hr.tentativeJoiningDate)}
                          </strong>
                        </p>
                      ) : (
                        <p
                          style={{
                            fontSize: 11,
                            color: "#9aa0a6",
                            margin: "2px 0 4px",
                          }}
                        >
                          📅 Tentative Joining: <em>Not set</em>
                        </p>
                      )}

                      {/* ✅ Email notification status */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {hr.notified ? (
                          <span
                            style={{
                              ...s.statusPill,
                              background: "#EAF3DE",
                              color: "#27500A",
                              border: "0.5px solid #C0DD97",
                              fontSize: 11,
                            }}
                          >
                            ✅ Email Sent{" "}
                            {hr.notifiedAt ? `at ${hr.notifiedAt}` : ""}
                          </span>
                        ) : sendingEmail === hr.id ? (
                          <span
                            style={{
                              ...s.statusPill,
                              background: "#FAEEDA",
                              color: "#633806",
                              border: "0.5px solid #FAC775",
                              fontSize: 11,
                            }}
                          >
                            ⏳ Sending email...
                          </span>
                        ) : (
                          <span
                            style={{
                              ...s.statusPill,
                              background: "#f1f3f4",
                              color: "#5f6368",
                              border: "0.5px solid #dadce0",
                              fontSize: 11,
                            }}
                          >
                            📧 Not sent yet
                          </span>
                        )}
                        {/* Resend button */}
                        <button
                          style={{
                            ...s.actionBtn,
                            fontSize: 11,
                            height: 24,
                            padding: "0 8px",
                            background: "#E6F1FB",
                            color: "#185FA5",
                            border: "0.5px solid #B5D4F4",
                          }}
                          onClick={() => sendHrEmail(hr)}
                          disabled={sendingEmail === hr.id}
                        >
                          {sendingEmail === hr.id ? "⏳" : "↻"} Resend
                        </button>
                      </div>

                      <div style={s.ivInHrBox}>
                        <p style={s.ivInHrLabel}>
                          SCHEDULED INTERVIEWS
                          {interviews.length > 0 && (
                            <span style={s.newBadge}>{interviews.length}</span>
                          )}
                        </p>
                        {interviews.length > 0 ? (
                          interviews.map((iv) => (
                            <div key={iv.id} style={s.ivInHrItem}>
                              <div style={{ flex: 1 }}>
                                <p style={s.ivInHrName}>{iv.candidateName}</p>
                                <p style={s.ivInHrMeta}>
                                  {[
                                    iv.designation,
                                    iv.department,
                                    iv.dateOfInterview,
                                    iv.timeOfInterview
                                      ? `at ${iv.timeOfInterview}`
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>
                              <span
                                style={{
                                  ...s.statusPill,
                                  ...statusColor(iv.status),
                                  fontSize: 10,
                                }}
                              >
                                {iv.status}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p style={s.ivInHrEmpty}>
                            No interviews scheduled yet.
                          </p>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 6,
                      }}
                    >
                      <span style={s.accessBadge}>Access Granted</span>
                      <button
                        style={s.removeBtn}
                        onClick={() => removeHr(hr.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CV Upload & Shortlist */}
          <div style={s.card}>
            <h2 style={s.sectionTitle}>
              CV Upload &amp; Shortlist
              {cvList.length > 0 && (
                <span style={s.badge}>{cvList.length} CVs</span>
              )}
              {shortCount > 0 && (
                <span
                  style={{
                    ...s.badge,
                    background: "#EEEDFE",
                    color: "#3C3489",
                    border: "0.5px solid #AFA9EC",
                  }}
                >
                  {shortCount} Shortlisted
                </span>
              )}
            </h2>
            <div style={s.row}>
              <div style={{ ...s.field, flex: 1 }}>
                <label style={s.label}>Designation for CV</label>
                <select
                  style={s.input}
                  value={cvDesig}
                  onChange={(e) => setCvDesig(e.target.value)}
                >
                  <option value="">— Select Designation —</option>
                  {designations.map((d, i) => (
                    <option key={i} value={d.title}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ ...s.field, justifyContent: "flex-end" }}>
                <label style={s.label}>Upload CV (PDF / DOC)</label>
                <label style={s.uploadBtn}>
                  + Upload CV
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleCvUpload}
                  />
                </label>
              </div>
            </div>

            {cvList.length > 0 && (
              <div style={s.tabBar}>
                <button
                  style={{ ...s.tab, ...(cvTab === "all" ? s.tabActive : {}) }}
                  onClick={() => setCvTab("all")}
                >
                  All CVs ({cvList.length})
                </button>
                <button
                  style={{
                    ...s.tab,
                    ...(cvTab === "shortlisted" ? s.tabActive : {}),
                  }}
                  onClick={() => setCvTab("shortlisted")}
                >
                  Shortlisted ({shortCount})
                </button>
              </div>
            )}

            {filteredCv.length === 0 ? (
              <p style={s.emptyHint}>
                {cvTab === "shortlisted"
                  ? "No CVs shortlisted yet."
                  : "No CVs uploaded yet."}
              </p>
            ) : (
              <div style={{ marginTop: 14 }}>
                {filteredCv.map((cv) => (
                  <div
                    key={cv.id}
                    style={{
                      ...s.cvCard,
                      ...(cv.shortlisted ? s.cvCardShortlisted : {}),
                    }}
                  >
                    <div style={s.cvTop}>
                      <div style={{ flex: 1 }}>
                        <p style={s.cvName}>{cv.name}</p>
                        <p style={s.cvMeta}>
                          {cv.designation} &nbsp;·&nbsp; {cv.uploadedAt}
                        </p>
                      </div>
                      <div style={s.cvActions}>
                        <span
                          style={{ ...s.statusPill, ...statusColor(cv.status) }}
                        >
                          {cv.status}
                        </span>
                        <button
                          style={{
                            ...s.actionBtn,
                            ...(cv.shortlisted
                              ? s.shortlistedBtn
                              : s.shortlistBtn),
                          }}
                          onClick={() => toggleShortlist(cv.id)}
                        >
                          {cv.shortlisted ? "★ Shortlisted" : "☆ Shortlist"}
                        </button>
                        <button
                          style={s.actionBtn}
                          onClick={() => updateCvStatus(cv.id, "Approved")}
                        >
                          Approve
                        </button>
                        <button
                          style={{ ...s.actionBtn, ...s.rejectBtn }}
                          onClick={() => updateCvStatus(cv.id, "Rejected")}
                        >
                          Reject
                        </button>
                        <button
                          style={s.removeBtn}
                          onClick={() => removeCv(cv.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {cv.notes.length > 0 && (
                      <div style={s.noteList}>
                        {cv.notes.map((n, i) => (
                          <div key={i} style={s.noteItem}>
                            <span style={s.noteBy}>{n.by}</span>
                            <span style={s.noteText}>{n.text}</span>
                            <span style={s.noteTime}>{n.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedCvId === cv.id ? (
                      <div style={s.noteInput}>
                        <input
                          style={{ ...s.input, flex: 1 }}
                          placeholder="Add a discussion note..."
                          value={discussNote}
                          onChange={(e) => setDiscussNote(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addNote(cv.id)}
                          autoFocus
                        />
                        <button style={s.addBtn} onClick={() => addNote(cv.id)}>
                          Add
                        </button>
                        <button
                          style={s.cancelBtn}
                          onClick={() => setSelectedCvId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        style={s.discussBtn}
                        onClick={() => setSelectedCvId(cv.id)}
                      >
                        + Add Note
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interview Process */}
          <div style={s.card}>
            <h2 style={s.sectionTitle}>
              Interview Process
              <span style={{ fontSize: 12, color: "#5f6368", fontWeight: 400 }}>
                — Scheduled by HR
              </span>
              {interviews.length > 0 && (
                <span style={s.badge}>{interviews.length} interviews</span>
              )}
            </h2>

            <div style={s.interviewFormBox}>
              <p style={s.subLabel}>
                {editingInterviewId !== null
                  ? "✎ Edit Interview"
                  : "📅 Schedule New Interview"}
              </p>
              <div style={s.grid}>
                <div style={s.field}>
                  <label style={s.label}>
                    Candidate Name <span style={s.required}>*</span>
                  </label>
                  <input
                    style={s.input}
                    name="candidateName"
                    placeholder="Type candidate name"
                    value={interviewForm.candidateName}
                    onChange={handleInterviewChange}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Designation</label>
                  <select
                    style={s.input}
                    name="designation"
                    value={interviewForm.designation}
                    onChange={handleInterviewDesigChange}
                  >
                    <option value="">— Select Designation —</option>
                    {designations.map((d, i) => (
                      <option key={i} value={d.title}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Department</label>
                  <select
                    style={s.input}
                    name="department"
                    value={interviewForm.department}
                    onChange={handleInterviewChange}
                  >
                    <option value="">— Select Department —</option>
                    <option>Engineering</option>
                    <option>Product</option>
                    <option>Design</option>
                    <option>Human Resources</option>
                    <option>Finance</option>
                    <option>Marketing</option>
                    <option>Operations</option>
                    <option>Sales</option>
                  </select>
                </div>
                {interviewForm.designation && cvCandidates.length > 0 && (
                  <div style={s.field}>
                    <label style={s.label}>
                      Fill from CV List{" "}
                      <span
                        style={{
                          fontSize: 11,
                          color: "#9aa0a6",
                          fontWeight: 400,
                          marginLeft: 6,
                        }}
                      >
                        (optional)
                      </span>
                    </label>
                    <select
                      style={s.input}
                      value=""
                      onChange={(e) => {
                        if (e.target.value)
                          setInterviewForm((prev) => ({
                            ...prev,
                            candidateName: e.target.value,
                          }));
                      }}
                    >
                      <option value="">— Pick from uploaded CVs —</option>
                      {cvCandidates.map((cv) => (
                        <option key={cv.id} value={cv.name}>
                          {cv.name}
                          {cv.shortlisted ? " ★" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={s.field}>
                  <label style={s.label}>
                    Date of Interview <span style={s.required}>*</span>
                  </label>
                  <input
                    style={s.input}
                    type="date"
                    name="dateOfInterview"
                    value={interviewForm.dateOfInterview}
                    onChange={handleInterviewChange}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Time of Interview</label>
                  <input
                    style={s.input}
                    type="time"
                    name="timeOfInterview"
                    value={interviewForm.timeOfInterview}
                    onChange={handleInterviewChange}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Remarks Required</label>
                  <select
                    style={s.input}
                    name="remarksRequired"
                    value={interviewForm.remarksRequired}
                    onChange={handleInterviewChange}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Status</label>
                  <select
                    style={s.input}
                    name="status"
                    value={interviewForm.status}
                    onChange={handleInterviewChange}
                  >
                    {interviewStatusList.map((st) => (
                      <option key={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {interviewForm.remarksRequired === "Yes" && (
                <div style={{ ...s.field, marginTop: 10 }}>
                  <label style={s.label}>
                    Remarks <span style={s.required}>*</span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#9aa0a6",
                        fontWeight: 400,
                        marginLeft: 6,
                      }}
                    >
                      (Required)
                    </span>
                  </label>
                  <textarea
                    style={{
                      ...s.input,
                      height: 80,
                      padding: "8px 10px",
                      resize: "vertical",
                      lineHeight: 1.5,
                    }}
                    name="remarks"
                    placeholder="Enter interview remarks..."
                    value={interviewForm.remarks}
                    onChange={handleInterviewChange}
                  />
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 4,
                  flexWrap: "wrap",
                }}
              >
                <button style={s.addBtn} onClick={addInterview}>
                  {editingInterviewId !== null
                    ? "Update Interview"
                    : "+ Schedule Interview"}
                </button>
                {editingInterviewId !== null && (
                  <button style={s.cancelBtn} onClick={cancelEditInterview}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {interviews.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ ...s.tabBar, overflowX: "auto" }}>
                  <button
                    style={{
                      ...s.tab,
                      ...(interviewTab === "all" ? s.tabActive : {}),
                    }}
                    onClick={() => setInterviewTab("all")}
                  >
                    All ({interviews.length})
                  </button>
                  {interviewStatusList.map((st) => {
                    const count = interviews.filter(
                      (iv) => iv.status === st,
                    ).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={st}
                        style={{
                          ...s.tab,
                          ...(interviewTab === st ? s.tabActive : {}),
                        }}
                        onClick={() => setInterviewTab(st)}
                      >
                        {st} ({count})
                      </button>
                    );
                  })}
                </div>
                {filteredInterviews.length === 0 ? (
                  <p style={s.emptyHint}>No interviews with this status.</p>
                ) : (
                  filteredInterviews.map((iv) => (
                    <div key={iv.id} style={s.interviewCard}>
                      <div style={s.cvTop}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <p style={s.cvName}>{iv.candidateName}</p>
                          <p style={s.cvMeta}>
                            {iv.designation && (
                              <>{iv.designation} &nbsp;·&nbsp;</>
                            )}
                            {iv.department && (
                              <>{iv.department} &nbsp;·&nbsp;</>
                            )}
                            {iv.dateOfInterview}
                            {iv.timeOfInterview && (
                              <> &nbsp;at&nbsp; {iv.timeOfInterview}</>
                            )}
                          </p>
                        </div>
                        <div style={s.cvActions}>
                          <span
                            style={{
                              ...s.statusPill,
                              ...statusColor(iv.status),
                            }}
                          >
                            {iv.status}
                          </span>
                          <select
                            style={s.smSelectInline}
                            value={iv.status}
                            onChange={(e) =>
                              updateInterviewStatus(iv.id, e.target.value)
                            }
                          >
                            {interviewStatusList.map((st) => (
                              <option key={st}>{st}</option>
                            ))}
                          </select>
                          <button
                            style={{
                              ...s.actionBtn,
                              background: "#E6F1FB",
                              color: "#185FA5",
                              border: "0.5px solid #B5D4F4",
                            }}
                            onClick={() => editInterview(iv)}
                          >
                            Edit
                          </button>
                          <button
                            style={s.removeBtn}
                            onClick={() => removeInterview(iv.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div style={s.remarksBox}>
                        <span style={s.remarksLabel}>
                          Remarks &nbsp;
                          {iv.remarksRequired === "Yes" ? (
                            <span
                              style={{
                                ...s.statusPill,
                                ...statusColor("Scheduled"),
                                fontSize: 10,
                                padding: "1px 6px",
                              }}
                            >
                              Required
                            </span>
                          ) : (
                            <span
                              style={{
                                ...s.statusPill,
                                background: "#f1f3f4",
                                color: "#5f6368",
                                border: "0.5px solid #dadce0",
                                fontSize: 10,
                                padding: "1px 6px",
                              }}
                            >
                              Optional
                            </span>
                          )}
                        </span>
                        <p style={s.remarksText}>
                          {iv.remarks || (
                            <span
                              style={{ color: "#9aa0a6", fontStyle: "italic" }}
                            >
                              No remarks added.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Salary Structure */}
          {designations.length > 0 && (
            <div style={s.card}>
              <h2 style={s.sectionTitle}>Salary Structure</h2>
              <div style={{ ...s.field, maxWidth: 280 }}>
                <label style={s.label}>
                  Select Designation <span style={s.required}>*</span>
                </label>
                <select
                  style={s.input}
                  value={selectedDesig}
                  onChange={(e) => setSelectedDesig(e.target.value)}
                >
                  <option value="">— Select Designation —</option>
                  {designations.map((d, i) => (
                    <option key={i} value={d.title}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
              <div style={s.salaryBox}>
                <p style={s.salaryTitle}>
                  Monthly Salary Breakdown <span style={s.badge}>Monthly</span>
                </p>
                <div style={s.salaryGrid}>
                  {[
                    ["basic", "Basic Salary (₹)", "40000"],
                    ["hra", "HRA (₹)", "15000"],
                    ["allowance", "Allowance (₹)", "5000"],
                  ].map(([name, label, ph]) => (
                    <div key={name} style={s.field}>
                      <label style={s.label}>{label}</label>
                      <input
                        style={s.input}
                        type="number"
                        name={name}
                        placeholder={`e.g. ${ph}`}
                        value={salary[name]}
                        onChange={handleSalaryChange}
                      />
                    </div>
                  ))}
                  <div style={s.field}>
                    <label style={s.label}>Total (₹)</label>
                    <div style={{ ...s.input, ...s.totalBox }}>
                      {salaryTotal > 0 ? fmt(salaryTotal) : "—"}
                    </div>
                  </div>
                </div>
              </div>
              <button style={s.addBtn} onClick={addEmployee}>
                + Add Salary Entry
              </button>

              {employees.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div
                    style={{
                      ...s.colHdr,
                      gridTemplateColumns: "1fr 1fr 1fr 36px",
                    }}
                  >
                    <span style={s.colLabel}>Designation</span>
                    <span style={s.colLabel}>Basic</span>
                    <span style={s.colLabel}>Total / Month</span>
                    <span />
                  </div>
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      style={{
                        ...s.desigItem,
                        gridTemplateColumns: "1fr 1fr 1fr 36px",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#1a1a1a" }}>
                        {emp.designation}
                      </span>
                      <span style={{ fontSize: 13, color: "#5f6368" }}>
                        {fmt(emp.salary.basic || 0)}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "#185FA5",
                          fontWeight: 500,
                        }}
                      >
                        {emp.salary.total > 0 ? fmt(emp.salary.total) : "—"}
                      </span>
                      <button
                        style={s.removeBtn}
                        onClick={() => removeEmployee(emp.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button style={s.submitBtn} onClick={handleSubmit}>
            Save Recruitment Entry
          </button>
        </>
      )}
    </div>
  );
};

const s = {
  wrap: {
    padding: "32px 20px",
    maxWidth: 900,
    margin: "0 auto",
    fontFamily: "sans-serif",
    background: "#f4f7f9",
    minHeight: "100vh",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "0.5px solid #dadce0",
    padding: "20px 24px",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 500,
    color: "#1a1a1a",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: "0.5px solid #e8eaed",
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  row: { display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 },
  label: { fontSize: 13, color: "#5f6368", fontWeight: 500 },
  required: { color: "#E24B4A" },
  input: {
    height: 36,
    padding: "0 10px",
    border: "0.5px solid #dadce0",
    borderRadius: 8,
    fontSize: 14,
    color: "#1a1a1a",
    background: "#fff",
    width: "100%",
    boxSizing: "border-box",
  },
  badge: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 20,
    background: "#E6F1FB",
    color: "#185FA5",
    fontWeight: 400,
  },
  budgetBar: {
    marginTop: 12,
    padding: "10px 14px",
    borderRadius: 8,
    background: "#E6F1FB",
    border: "0.5px solid #B5D4F4",
  },
  budgetOver: { background: "#FCEBEB", border: "0.5px solid #F7C1C1" },
  budgetText: { fontSize: 13, color: "#185FA5" },
  budgetTextOver: { fontSize: 13, color: "#A32D2D" },
  addBtn: {
    marginTop: 12,
    height: 36,
    padding: "0 20px",
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  colHdr: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 36px",
    gap: 8,
    padding: "0 10px",
    marginBottom: 4,
  },
  colLabel: { fontSize: 12, color: "#5f6368", fontWeight: 500 },
  desigItem: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 36px",
    gap: 8,
    alignItems: "center",
    padding: "10px",
    border: "0.5px solid #e8eaed",
    borderRadius: 8,
    background: "#f8f9fa",
    marginBottom: 8,
  },
  smInput: {
    height: 32,
    padding: "0 8px",
    border: "0.5px solid #dadce0",
    borderRadius: 6,
    fontSize: 13,
    color: "#1a1a1a",
    background: "#fff",
    width: "100%",
  },
  removeBtn: {
    width: 28,
    height: 28,
    border: "none",
    background: "none",
    color: "#9aa0a6",
    cursor: "pointer",
    borderRadius: 6,
    fontSize: 14,
  },
  emptyHint: {
    fontSize: 13,
    color: "#9aa0a6",
    textAlign: "center",
    padding: "16px 0",
  },
  submitBtn: {
    width: "100%",
    height: 44,
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    marginTop: 4,
  },
  salaryBox: {
    marginTop: 16,
    padding: "16px",
    background: "#f8f9fa",
    border: "0.5px solid #e8eaed",
    borderRadius: 8,
  },
  salaryTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "#1a1a1a",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  salaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
  },
  totalBox: {
    display: "flex",
    alignItems: "center",
    background: "#E6F1FB",
    border: "0.5px solid #B5D4F4",
    color: "#0C447C",
    fontWeight: 500,
  },
  hrRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 0",
    borderBottom: "0.5px solid #f1f3f4",
  },
  hrAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#EEEDFE",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 500,
    color: "#3C3489",
    flexShrink: 0,
  },
  hrName: { fontSize: 14, fontWeight: 500, color: "#1a1a1a", margin: 0 },
  hrEmailStyle: { fontSize: 12, color: "#5f6368", margin: "2px 0 0" },
  accessBadge: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 20,
    background: "#EAF3DE",
    color: "#27500A",
    border: "0.5px solid #C0DD97",
    whiteSpace: "nowrap",
  },
  uploadBtn: {
    height: 36,
    padding: "0 16px",
    background: "#f1f3f4",
    border: "0.5px solid #dadce0",
    borderRadius: 8,
    fontSize: 14,
    color: "#1a1a1a",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  },
  cvCard: {
    border: "0.5px solid #e8eaed",
    borderRadius: 8,
    padding: "12px",
    marginBottom: 10,
    background: "#fafafa",
  },
  cvCardShortlisted: { border: "0.5px solid #AFA9EC", background: "#EEEDFE" },
  cvTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    flexWrap: "wrap",
  },
  cvName: { fontSize: 14, fontWeight: 500, color: "#1a1a1a", margin: 0 },
  cvMeta: { fontSize: 12, color: "#5f6368", margin: "2px 0 0" },
  cvActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  statusPill: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 20,
    fontWeight: 500,
  },
  actionBtn: {
    height: 28,
    padding: "0 10px",
    background: "#EAF3DE",
    color: "#27500A",
    border: "0.5px solid #C0DD97",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
  },
  rejectBtn: {
    background: "#FCEBEB",
    color: "#791F1F",
    border: "0.5px solid #F7C1C1",
  },
  shortlistBtn: {
    background: "#EEEDFE",
    color: "#3C3489",
    border: "0.5px solid #AFA9EC",
  },
  shortlistedBtn: {
    background: "#3C3489",
    color: "#fff",
    border: "0.5px solid #3C3489",
  },
  noteList: { marginTop: 10, borderTop: "0.5px solid #e8eaed", paddingTop: 8 },
  noteItem: {
    display: "flex",
    gap: 8,
    alignItems: "baseline",
    marginBottom: 6,
  },
  noteBy: {
    fontSize: 12,
    fontWeight: 500,
    color: "#185FA5",
    whiteSpace: "nowrap",
  },
  noteText: { fontSize: 13, color: "#1a1a1a", flex: 1 },
  noteTime: { fontSize: 11, color: "#9aa0a6", whiteSpace: "nowrap" },
  noteInput: { display: "flex", gap: 8, marginTop: 10, alignItems: "center" },
  discussBtn: {
    marginTop: 8,
    fontSize: 12,
    color: "#185FA5",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  cancelBtn: {
    height: 36,
    padding: "0 12px",
    background: "none",
    border: "0.5px solid #dadce0",
    borderRadius: 8,
    fontSize: 13,
    color: "#5f6368",
    cursor: "pointer",
    marginTop: 12,
  },
  tabBar: {
    display: "flex",
    gap: 4,
    marginTop: 14,
    marginBottom: 0,
    borderBottom: "0.5px solid #e8eaed",
    overflowX: "auto",
  },
  tab: {
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    border: "none",
    background: "none",
    color: "#5f6368",
    borderBottom: "2px solid transparent",
    marginBottom: -1,
    whiteSpace: "nowrap",
  },
  tabActive: {
    color: "#1a73e8",
    borderBottomColor: "#1a73e8",
    fontWeight: 500,
  },
  interviewFormBox: {
    background: "#f8f9fa",
    border: "0.5px solid #e8eaed",
    borderRadius: 8,
    padding: "16px",
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "#5f6368",
    marginBottom: 12,
  },
  interviewCard: {
    border: "0.5px solid #e8eaed",
    borderRadius: 8,
    padding: "12px",
    marginBottom: 10,
    background: "#fafafa",
  },
  smSelectInline: {
    height: 28,
    padding: "0 6px",
    border: "0.5px solid #dadce0",
    borderRadius: 6,
    fontSize: 12,
    color: "#1a1a1a",
    background: "#fff",
    cursor: "pointer",
  },
  remarksBox: {
    marginTop: 10,
    borderTop: "0.5px solid #e8eaed",
    paddingTop: 8,
  },
  remarksLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "#5f6368",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  remarksText: {
    fontSize: 13,
    color: "#1a1a1a",
    marginTop: 4,
    lineHeight: 1.5,
  },
  topTabBar: { display: "flex", gap: 8, marginBottom: 16 },
  topTab: {
    flex: 1,
    height: 42,
    border: "0.5px solid #dadce0",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    background: "#fff",
    color: "#5f6368",
  },
  topTabActive: {
    background: "#1a73e8",
    color: "#fff",
    border: "0.5px solid #1a73e8",
  },
  recordCard: {
    border: "0.5px solid #e8eaed",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
  },
  recordHeader: {
    padding: "14px 16px",
    cursor: "pointer",
    background: "#fafafa",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  recordId: { fontSize: 12, color: "#9aa0a6", fontWeight: 500 },
  recordDept: { fontSize: 14, fontWeight: 600, color: "#1a1a1a" },
  recordMeta: { fontSize: 12, color: "#5f6368" },
  expandArrow: { fontSize: 12, color: "#9aa0a6" },
  recordDetail: {
    padding: "16px",
    borderTop: "0.5px solid #e8eaed",
    background: "#fff",
  },
  detailSection: { marginBottom: 20 },
  detailTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1a1a1a",
    marginBottom: 10,
    margin: "0 0 10px 0",
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  empDetailCard: {
    border: "0.5px solid #e8eaed",
    borderRadius: 8,
    padding: "14px",
    marginBottom: 10,
    background: "#fafafa",
  },
  empCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  salaryBreakdown: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    padding: "8px 12px",
    background: "#E6F1FB",
    borderRadius: 6,
    border: "0.5px solid #B5D4F4",
  },
  salBreakItem: { fontSize: 12, color: "#185FA5" },
  ivInHrBox: {
    background: "#f8f9fa",
    border: "0.5px solid #e8eaed",
    borderRadius: 8,
    padding: "10px 12px",
    marginTop: 6,
  },
  ivInHrLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "#5f6368",
    marginBottom: 8,
    letterSpacing: "0.02em",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  ivInHrItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "8px",
    background: "#fff",
    border: "0.5px solid #e8eaed",
    borderRadius: 8,
    marginBottom: 6,
  },
  ivInHrName: { fontSize: 13, fontWeight: 500, color: "#1a1a1a", margin: 0 },
  ivInHrMeta: { fontSize: 11, color: "#5f6368", margin: "2px 0 0" },
  ivInHrEmpty: {
    fontSize: 12,
    color: "#9aa0a6",
    fontStyle: "italic",
    padding: "2px 0",
  },
  newBadge: {
    fontSize: 10,
    padding: "1px 6px",
    borderRadius: 20,
    background: "#E6F1FB",
    color: "#0C447C",
    border: "0.5px solid #85B7EB",
  },
  // ✅ NEW notification styles
  notifBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#FAEEDA",
    border: "0.5px solid #FAC775",
    borderRadius: 8,
    padding: "10px 14px",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  notifBannerBtn: {
    height: 30,
    padding: "0 14px",
    background: "#633806",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};

export default EmployeeForm;
