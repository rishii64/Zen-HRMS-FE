import { useState, useCallback, useEffect } from "react";

const API = "http://localhost:3002";

const C = {
  purple: { 50: "#EEEDFE", 200: "#AFA9EC", 400: "#7F77DD", 600: "#534AB7", 800: "#3C3489" },
  amber:  { 50: "#FAEEDA", 200: "#EF9F27", 600: "#854F0B", 800: "#633806" },
  teal:   { 50: "#E1F5EE", 200: "#5DCAA5", 600: "#0F6E56", 800: "#085041" },
  red:    { 50: "#FCEBEB", 200: "#F09595", 600: "#A32D2D" },
  green:  { 50: "#EAF3DE", 200: "#97C459", 600: "#3B6D11" },
  gray:   { 50: "#F1EFE8", 200: "#B4B2A9", 600: "#5F5E5A" },
  orange: { 50: "#FFF7ED", 200: "#FED7AA", 600: "#C2410C" },
};

const inputStyle = {
  width: "100%", padding: "9px 12px", fontSize: 13,
  border: "1px solid #e2e8f0", borderRadius: 10,
  background: "#fdfdfd", color: "#1a202c",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};
const inputErrorStyle = {
  ...inputStyle,
  border: `1.5px solid ${C.red[200]}`,
  background: C.red[50],
};
const cardStyle = {
  background: "#fff", border: "1px solid #edf2f7",
  borderRadius: 16, padding: "1.5rem", marginBottom: "1.25rem",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

const TRAINING_CONFIG = [
  { key: "hr",            label: "HR Training",               days: 3, group: "induction" },
  { key: "culture",       label: "Company Culture & Values",  days: 1, group: "induction" },
  { key: "payroll",       label: "Payroll & Leave Policy",    days: 1, group: "induction" },
  { key: "posh",          label: "POSH & Code of Conduct",    days: 1, group: "induction" },
  { key: "pos",           label: "POS Training",              days: 2, group: "induction" },
  { key: "dept",          label: "Department Training",       days: 1, group: "induction" },
  { key: "floor",         label: "Floor / Store Training",    days: 1, group: "induction" },
  { key: "grooming",      label: "Grooming & Uniform",        days: 1, group: "induction" },
  { key: "compliance",    label: "Compliance & Policy",       days: 1, group: "induction" },
  { key: "it_security",   label: "IT Security & Cyber Safety",days: 1, group: "induction" },
  { key: "behavioral",    label: "Behavioral Standard",       days: 1, group: "induction" },
  { key: "product",       label: "Product Knowledge",         days: 2, group: "product"   },
  { key: "customer",      label: "Customer Service",          days: 1, group: "product"   },
  { key: "communication", label: "Communication Skills",      days: 1, group: "product"   },
  { key: "softskills",    label: "Soft Skills",               days: 2, group: "product"   },
  { key: "billing",       label: "Billing Training",          days: 1, group: "product"   },
  { key: "merchandising", label: "Visual Merchandising",      days: 1, group: "product"   },
  { key: "inventory",     label: "Inventory & Stock Take",    days: 1, group: "product"   },
  { key: "sales_tech",    label: "Upselling Techniques",      days: 1, group: "product"   },
  { key: "market_trend",  label: "Market Trends & Insights",  days: 1, group: "product"   },
  { key: "safety",        label: "Safety Training",           days: 1, group: "safety"    },
  { key: "fire",          label: "Fire Safety & Evacuation",  days: 1, group: "safety"    },
  { key: "firstaid",      label: "First Aid Training",        days: 1, group: "safety"    },
  { key: "ojt",           label: "OJT",                       days: 3, group: "safety"    },
  { key: "loss_prev",     label: "Loss Prevention",           days: 1, group: "safety"    },
  { key: "emergency",     label: "Emergency Response Plan",   days: 1, group: "safety"    },
  { key: "health_hygiene",label: "Health & Hygiene",          days: 1, group: "safety"    },
  { key: "first_aid_adv", label: "Advanced First Aid",        days: 1, group: "safety"    },
  { key: "waste_mgmt",    label: "Waste & Environment",       days: 1, group: "safety"    },
];

const GROUPS = [
  { key: "induction", label: "🏢 Induction Trainings",  accent: C.purple[600], bg: C.purple[50], border: C.purple[200] },
  { key: "product",   label: "📦 Product & Customer",   accent: C.amber[600],  bg: C.amber[50],  border: C.amber[200]  },
  { key: "safety",    label: "🛡️ Safety & On-the-Job",  accent: C.teal[600],   bg: C.teal[50],   border: C.teal[200]   },
];

// ── Validation helpers ────────────────────────────────────────────────────────
function validatePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10;
}

function validateEmail(email) {
  // Must end with @gmail.com exactly — nothing after .com
  return /^[a-zA-Z0-9._%+\-]+@gmail\.com$/.test(email.trim());
}

// ── Helper: file type check ───────────────────────────────────────────────────
function isImageFile(file) {
  if (!file) return false;
  if (file instanceof File) return file.type?.startsWith("image/");
  const ext = String(file).split(".").pop().toLowerCase();
  return ["jpg","jpeg","png","gif","webp","bmp","svg"].includes(ext);
}
function isPdfFile(file) {
  if (!file) return false;
  if (file instanceof File) return file.type === "application/pdf";
  return String(file).toLowerCase().endsWith(".pdf");
}

// ── File Preview ──────────────────────────────────────────────────────────────
function FilePreview({ file, height = 120, baseUrl = "" }) {
  if (!file) return null;

  if (file instanceof File) {
    if (isImageFile(file)) {
      return (
        <div style={{ marginTop: 6, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", height, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={URL.createObjectURL(file)} alt={file.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
        </div>
      );
    }
    if (isPdfFile(file)) {
      return (
        <div style={{ marginTop: 6, borderRadius: 8, border: "1px solid #e2e8f0", height, background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div style={{ fontSize: 32 }}>📄</div>
          <div style={{ fontSize: 11, color: "#718096", fontWeight: 600, textAlign: "center", padding: "0 8px" }}>{file.name}</div>
          <a href={URL.createObjectURL(file)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.purple[600], fontWeight: 700, background: C.purple[50], padding: "3px 10px", borderRadius: 6, textDecoration: "none", border: `1px solid ${C.purple[200]}` }}>Open PDF ↗</a>
        </div>
      );
    }
    const ext = file.name?.split(".").pop()?.toUpperCase() || "FILE";
    const extColors = { DOCX: "#2563EB", DOC: "#2563EB", XLSX: "#16a34a", XLS: "#16a34a", CSV: "#16a34a", PPTX: "#dc2626", PPT: "#dc2626" };
    const color = extColors[ext] || "#718096";
    return (
      <div style={{ marginTop: 6, borderRadius: 8, border: "1px solid #e2e8f0", padding: "8px 10px", background: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 10, color: "#fff", background: color, padding: "3px 7px", borderRadius: 4 }}>{ext}</span>
        <span style={{ fontSize: 11, color: "#4a5568", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
      </div>
    );
  }

  const filename = String(file);
  const url = `${baseUrl}/uploads/${filename}`;
  const originalName = filename.replace(/^\d+_\d+\./, "file.");

  if (isImageFile(filename)) {
    return (
      <div style={{ marginTop: 6, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", minHeight: height }}>
        <img src={url} alt={originalName} style={{ maxWidth: "100%", maxHeight: height * 1.5, objectFit: "contain", display: "block" }}
          onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
        <div style={{ display: "none", flexDirection: "column", alignItems: "center", gap: 4, padding: 10 }}>
          <span style={{ fontSize: 24 }}>🖼️</span>
          <span style={{ fontSize: 11, color: "#a0aec0" }}>Image load failed</span>
        </div>
      </div>
    );
  }

  if (isPdfFile(filename)) {
    return (
      <div style={{ marginTop: 6, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, minHeight: 80 }}>
        <div style={{ fontSize: 32 }}>📄</div>
        <div style={{ fontSize: 11, color: "#718096", fontWeight: 600, textAlign: "center" }}>{originalName}</div>
        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.purple[600], fontWeight: 700, background: C.purple[50], padding: "3px 10px", borderRadius: 6, textDecoration: "none", border: `1px solid ${C.purple[200]}` }}>Open PDF ↗</a>
      </div>
    );
  }

  const ext = filename.split(".").pop().toUpperCase();
  const extColors = { DOCX: "#2563EB", DOC: "#2563EB", XLSX: "#16a34a", XLS: "#16a34a", CSV: "#16a34a", PPTX: "#dc2626", PPT: "#dc2626" };
  const color = extColors[ext] || "#718096";
  return (
    <div style={{ marginTop: 6, borderRadius: 8, border: "1px solid #e2e8f0", padding: "8px 10px", background: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontWeight: 800, fontSize: 10, color: "#fff", background: color, padding: "3px 7px", borderRadius: 4 }}>{ext}</span>
      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.purple[600], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none", fontWeight: 600 }}>{originalName} ↗</a>
    </div>
  );
}

function initials(name) {
  const w = (name || "").trim().split(" ").filter(Boolean);
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : w.length === 1 ? w[0][0].toUpperCase() : "?";
}

function buildEmptyModules() {
  return Object.fromEntries(TRAINING_CONFIG.map(({ key, days }) => [key, { dates: Array(days).fill(""), trainer: "", questions: null, resultSheet: null, marks: "", mandatory: false }]));
}

function SectionTitle({ children, color = C.purple[600] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
    </div>
  );
}

function Field({ label, children, full, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: full ? "1/-1" : undefined }}>
      <label style={{ fontSize: 13, color: "#4a5568", fontWeight: 600 }}>
        {label}
        {required && <span style={{ color: C.red[600], marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <span style={{ fontSize: 11, color: C.red[600], fontWeight: 600, marginTop: 2 }}>⚠ {msg}</span>;
}

function Badge({ children, variant = "gray" }) {
  const map = {
    pass: { bg: C.green[50], color: C.green[600] }, fail: { bg: C.red[50], color: C.red[600] },
    pending: { bg: C.gray[50], color: C.gray[600] }, gray: { bg: C.gray[50], color: C.gray[600] },
    purple: { bg: C.purple[50], color: C.purple[800] }, amber: { bg: C.amber[50], color: C.amber[600] },
    teal: { bg: C.teal[50], color: C.teal[600] }, mandatory: { bg: C.orange[50], color: C.orange[600] },
  };
  const s = map[variant] || map.gray;
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{children}</span>;
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #edf2f7", marginBottom: "1.25rem", flexWrap: "wrap" }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: active === t.key ? 700 : 500, color: active === t.key ? C.purple[600] : "#718096", background: "transparent", border: "none", borderBottom: active === t.key ? `2px solid ${C.purple[600]}` : "2px solid transparent", cursor: "pointer", marginBottom: -2, fontFamily: "inherit" }}>{t.label}</button>
      ))}
    </div>
  );
}

function UploadZone({ label, file, onFile, accept, required, missing }) {
  const borderColor = missing ? C.red[200] : file ? C.teal[200] : "#cbd5e0";
  const bg = missing ? C.red[50] : file ? C.teal[50] : "#f8fafc";
  const textColor = missing ? C.red[600] : file ? C.teal[600] : "#718096";
  const displayName = file instanceof File ? file.name : file ? String(file) : null;
  return (
    <label style={{ display: "block", border: `1.5px dashed ${borderColor}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", background: bg, fontSize: 12, color: textColor, textAlign: "center", position: "relative" }}>
      <input type="file" accept={accept} style={{ display: "none" }} onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      {required && !file && <span style={{ position: "absolute", top: -7, right: -4, background: C.orange[600], color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 8 }}>REQUIRED</span>}
      {displayName ? `✓ ${displayName}` : label}
    </label>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    if (!username || !password) { setError("Please enter both fields."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("hr_token", data.token);
      localStorage.setItem("hr_fullname", data.fullName || username);
      onLogin(data.token, data.fullName || username);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#1a1060 0%,#3C3489 50%,#534AB7 100%)", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "2.5rem 2rem", width: "100%", maxWidth: 400, boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: C.purple[600], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 12px" }}>🏢</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a202c", margin: 0 }}>HR Manager Portal</h2>
          <p style={{ fontSize: 13, color: "#718096", marginTop: 6 }}>Only authorized HR personnel can access this.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Username"><input style={inputStyle} placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} /></Field>
          <Field label="Password"><input style={inputStyle} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} /></Field>
          {error && <div style={{ background: C.red[50], border: `1px solid ${C.red[200]}`, borderRadius: 10, padding: "10px 14px", color: C.red[600], fontSize: 13 }}>❌ {error}</div>}
          <button onClick={handleLogin} disabled={loading} style={{ padding: 14, background: loading ? "#94a3b8" : C.purple[600], color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(83,74,183,.4)", marginTop: 4 }}>
            {loading ? "Logging in..." : "🔐 HR Login"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#a0aec0", textAlign: "center", marginTop: "1.5rem" }}>Default: <strong>admin</strong> / <strong>admin123</strong></p>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function EmployeeDashboard({ token, hrName, onLogout, onNewEmployee, onViewEmployee }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API}/api/onboarding`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { setEmployees(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const deleteEmployee = async (id, name) => {
    if (!window.confirm(`Do you want to delete "${name}"?`)) return;
    await fetch(`${API}/api/onboarding/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setEmployees(p => p.filter(e => e.id !== id));
  };

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#1a1060,#534AB7)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>🏢</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>HR Onboarding Dashboard</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>Employee Training Management</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onNewEmployee} style={{ padding: "10px 20px", background: "#fff", color: C.purple[600], border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>+ New Employee</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(255,255,255,.15)", borderRadius: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.purple[200], color: C.purple[800], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{initials(hrName)}</div>
            <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{hrName}</span>
            <button onClick={onLogout} style={{ padding: "4px 10px", fontSize: 11, background: "rgba(255,255,255,.2)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Logout</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 30 }}>
          {[
            { label: "Total Employees", value: employees.length, color: C.purple[600], bg: C.purple[50], icon: "👥" },
            { label: "Avg Score", value: employees.length ? Math.round(employees.reduce((s, e) => s + (e.avg_score_pct || 0), 0) / employees.length) + "%" : "—", color: C.teal[600], bg: C.teal[50], icon: "📊" },
            { label: "Passed Modules", value: employees.reduce((s, e) => s + (e.passed_modules || 0), 0), color: C.green[600], bg: C.green[50], icon: "✅" },
            { label: "Failed Modules", value: employees.reduce((s, e) => s + (e.failed_modules || 0), 0), color: C.red[600], bg: C.red[50], icon: "❌" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: s.color, opacity: .8 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: 16 }}>
          <input style={inputStyle} placeholder="🔍 Search by name, department, employee code..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={cardStyle}>
          <SectionTitle>👥 Employee List</SectionTitle>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#a0aec0" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#a0aec0" }}>
              <div style={{ fontSize: 40 }}>📋</div>
              <div style={{ marginTop: 8 }}>No employees found</div>
              <button onClick={onNewEmployee} style={{ marginTop: 12, padding: "10px 20px", background: C.purple[600], color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>+ Add First Employee</button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Employee", "Department", "Designation", "Joining Date", "ID Status", "Passed", "Failed", "Avg Score", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#4a5568", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => (
                    <tr key={emp.id} style={{ borderTop: "1px solid #edf2f7" }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.purple[600], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                            {emp.id_card_image_url
                              ? <img src={`${API}/uploads/${emp.id_card_image_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                              : initials(emp.name)
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#1a202c" }}>{emp.name}</div>
                            <div style={{ fontSize: 11, color: "#a0aec0" }}>{emp.employee_code || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px", color: "#4a5568" }}>{emp.department || "—"}</td>
                      <td style={{ padding: "12px", color: "#4a5568" }}>{emp.designation || "—"}</td>
                      <td style={{ padding: "12px", color: "#4a5568", whiteSpace: "nowrap" }}>{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString("en-IN") : "—"}</td>
                      <td style={{ padding: "12px" }}><Badge variant={emp.id_status === "Issued" ? "teal" : emp.id_status === "Pending" ? "amber" : "gray"}>{emp.id_status || "—"}</Badge></td>
                      <td style={{ padding: "12px" }}><span style={{ fontWeight: 700, color: C.green[600] }}>{emp.passed_modules ?? "—"}</span></td>
                      <td style={{ padding: "12px" }}><span style={{ fontWeight: 700, color: C.red[600] }}>{emp.failed_modules ?? "—"}</span></td>
                      <td style={{ padding: "12px" }}>
                        {emp.avg_score_pct != null ? (
                          <div>
                            <div style={{ fontWeight: 700, color: emp.avg_score_pct >= 70 ? C.green[600] : C.red[600] }}>{Math.round(emp.avg_score_pct)}%</div>
                            <div style={{ height: 4, background: "#edf2f7", borderRadius: 4, width: 60, marginTop: 3 }}>
                              <div style={{ height: "100%", width: `${Math.min(emp.avg_score_pct, 100)}%`, background: emp.avg_score_pct >= 70 ? C.green[600] : C.red[600], borderRadius: 4 }} />
                            </div>
                          </div>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => onViewEmployee(emp.id)} style={{ padding: "5px 12px", background: C.purple[50], color: C.purple[600], border: `1px solid ${C.purple[200]}`, borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>View</button>
                          <button onClick={() => deleteEmployee(emp.id, emp.name)} style={{ padding: "5px 12px", background: C.red[50], color: C.red[600], border: `1px solid ${C.red[200]}`, borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EMPLOYEE VIEW ─────────────────────────────────────────────────────────────
function EmployeeView({ empId, token, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/onboarding/${empId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [empId, token]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#a0aec0", fontFamily: "'Segoe UI',sans-serif" }}>Loading...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.red[600], fontFamily: "'Segoe UI',sans-serif" }}>Employee not found</div>;

  const { employee: emp, modules, docs, passConfig } = data;
  const checklist = (() => { try { return JSON.parse(emp.checklist || "{}"); } catch { return {}; } })();
  const passMark = passConfig?.pass_mark || 70;
  const maxMarks = passConfig?.max_marks || 100;
  const moduleMap = {};
  (modules || []).forEach(m => { moduleMap[m.module_key] = m; });
  let totalPassed = 0, totalFailed = 0;
  TRAINING_CONFIG.forEach(({ key }) => {
    const m = moduleMap[key];
    if (m?.marks != null) { const pct = Math.round((m.marks / maxMarks) * 100); if (pct >= passMark) totalPassed++; else totalFailed++; }
  });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px", fontFamily: "'Segoe UI',sans-serif" }}>
      <button onClick={onBack} style={{ marginBottom: 20, padding: "8px 16px", background: C.purple[50], color: C.purple[600], border: `1px solid ${C.purple[200]}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>← Back to Dashboard</button>

      <div style={{ background: "linear-gradient(135deg,#534AB7,#3a3293)", borderRadius: 16, padding: "24px", marginBottom: 20, color: "#fff", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, border: "3px solid rgba(255,255,255,.3)", overflow: "hidden", flexShrink: 0 }}>
          {emp.id_card_image_url
            ? <img src={`${API}/uploads/${emp.id_card_image_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
            : initials(emp.name)
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{emp.name}</div>
          <div style={{ opacity: .8, fontSize: 14 }}>{emp.designation}  {emp.department}</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, marginTop: 4, opacity: .7 }}>{emp.employee_code || "ID: PENDING"}</div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[{ label: "Passed", value: totalPassed, color: "#86efac" }, { label: "Failed", value: totalFailed, color: "#fca5a5" }].map(s => (
            <div key={s.label} style={{ textAlign: "center", background: "rgba(255,255,255,.15)", borderRadius: 10, padding: "10px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, opacity: .8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {emp.id_card_image_url && (
        <div style={cardStyle}>
          <SectionTitle color={C.purple[600]}>🪪 ID Card Photo</SectionTitle>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img src={`${API}/uploads/${emp.id_card_image_url}`} alt="ID Card" style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 12, border: `2px solid ${C.purple[200]}` }} />
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <SectionTitle>👤 Employee Information</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          {[
            { label: "Email", value: emp.email },
            { label: "Phone", value: emp.phone },
            { label: "Father's Name", value: emp.father_name },
            { label: "Mother's Name", value: emp.mother_name },
            { label: "Address", value: emp.address },
            { label: "Joining Date", value: emp.joining_date ? new Date(emp.joining_date).toLocaleDateString("en-IN") : "—" },
            { label: "ID Status", value: emp.id_status },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, color: "#a0aec0", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{f.label}</div>
              <div style={{ fontSize: 13, color: "#1a202c", fontWeight: 600, wordBreak: "break-all", overflowWrap: "anywhere" }}>{f.value || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <SectionTitle color={C.green[600]}>✅ Welcome Kit Checklist</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[{ key: "lunch", label: "Lunch" }, { key: "stationary", label: "Stationary" }, { key: "laptop", label: "Laptop/Bag" }, { key: "workstation", label: "Workstation" }, { key: "credentials", label: "Credentials" }].map(item => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: `1.5px solid ${checklist[item.key] ? "#38a169" : "#e2e8f0"}`, borderRadius: 10, background: checklist[item.key] ? C.green[50] : "#fff" }}>
              <span style={{ color: checklist[item.key] ? "#38a169" : "#cbd5e0", fontWeight: 700 }}>{checklist[item.key] ? "✓" : "○"}</span>
              <span style={{ fontSize: 13, color: checklist[item.key] ? "#2f855a" : "#718096", fontWeight: checklist[item.key] ? 600 : 400 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {GROUPS.map(group => {
        const mods = TRAINING_CONFIG.filter(m => m.group === group.key);
        return (
          <div key={group.key} style={cardStyle}>
            <SectionTitle color={group.accent}>{group.label}</SectionTitle>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Module", "Date(s)", "Trainer", "Score", "%", "Question Paper", "Result Sheet", "Result"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#718096", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mods.map(({ key, label }) => {
                    const m = moduleMap[key];
                    const marks = m?.marks;
                    const pct = marks != null ? Math.round((marks / maxMarks) * 100) : null;
                    const isPassed = pct != null && pct >= passMark;
                    const isFailed = pct != null && pct < passMark;
                    const dates = (() => { try { return JSON.parse(m?.training_dates || "[]").filter(Boolean).join(", "); } catch { return "—"; } })();
                    return (
                      <tr key={key} style={{ borderTop: "1px solid #edf2f7", background: isPassed ? C.green[50] : isFailed ? C.red[50] : "transparent" }}>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ fontWeight: 600, color: "#1a202c" }}>{label}</span>
                          {m?.mandatory ? <span style={{ marginLeft: 5, fontSize: 10, color: C.orange[600], fontWeight: 800 }}>★M</span> : null}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#718096" }}>{dates || "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#4a5568" }}>{m?.trainer_name || "—"}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 700 }}>{marks ?? "—"}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: isPassed ? C.green[600] : isFailed ? C.red[600] : "#a0aec0" }}>{pct != null ? pct + "%" : "—"}</td>
                        <td style={{ padding: "8px 10px", minWidth: 120 }}>
                          {m?.questions_file ? <FilePreview file={m.questions_file} height={80} baseUrl={API} /> : <span style={{ color: "#a0aec0", fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ padding: "8px 10px", minWidth: 120 }}>
                          {m?.result_file ? <FilePreview file={m.result_file} height={80} baseUrl={API} /> : <span style={{ color: "#a0aec0", fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <Badge variant={isPassed ? "pass" : isFailed ? "fail" : "pending"}>{isPassed ? "PASS" : isFailed ? "FAIL" : "Pending"}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {docs?.length > 0 && (
        <div style={cardStyle}>
          <SectionTitle>📂 Documents</SectionTitle>
          {docs.map(d => (
            <div key={d.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", border: "1px solid #edf2f7", borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: "#a0aec0" }}>{d.file_name} · {d.category}</div>
                </div>
                <Badge variant="gray">{d.category}</Badge>
              </div>
              {(d.stored_name || d.file_name) && <FilePreview file={d.stored_name || d.file_name} height={140} baseUrl={API} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EMPLOYEE TAB — all fields mandatory ──────────────────────────────────────
function TabEmployee({ emp, setE, fieldErrors }) {
  return (
    <>
      <div style={cardStyle}>
        <SectionTitle>👤 Employee Information</SectionTitle>

        {/* Required fields notice */}
        <div style={{ marginBottom: 16, padding: "10px 14px", background: C.purple[50], border: `1px solid ${C.purple[200]}`, borderRadius: 10, fontSize: 12, color: C.purple[600], fontWeight: 600 }}>
          ⓘ All fields marked with <span style={{ color: C.red[600] }}>*</span> are required
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem 3rem" }}>
          <Field label="Name of Candidate" required>
            <input
              style={fieldErrors.name ? inputErrorStyle : inputStyle}
              placeholder="e.g. Rahul Sharma"
              value={emp.name}
              onChange={e => setE("name", e.target.value)}
            />
            <FieldError msg={fieldErrors.name} />
          </Field>

          <Field label="Email Address" required>
            <input
              style={fieldErrors.email ? inputErrorStyle : inputStyle}
              type="email"
              placeholder="example@gmail.com"
              value={emp.email}
              onChange={e => setE("email", e.target.value)}
            />
            <FieldError msg={fieldErrors.email} />
            {!fieldErrors.email && emp.email && (
              <span style={{ fontSize: 11, color: "#a0aec0" }}>Only @gmail.com allowed</span>
            )}
          </Field>

          <Field label="Phone No" required>
            <input
              style={fieldErrors.phone ? inputErrorStyle : inputStyle}
              placeholder="10-digit mobile number"
              value={emp.phone}
              maxLength={10}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setE("phone", val);
              }}
            />
            <FieldError msg={fieldErrors.phone} />
            {!fieldErrors.phone && (
              <span style={{ fontSize: 11, color: emp.phone.length === 10 ? C.green[600] : "#a0aec0", fontWeight: emp.phone.length === 10 ? 700 : 400 }}>
                {emp.phone.length}/10 digits {emp.phone.length === 10 ? "✓" : ""}
              </span>
            )}
          </Field>

          <Field label="Father's Name" required>
            <input
              style={fieldErrors.father ? inputErrorStyle : inputStyle}
              placeholder="Father's full name"
              value={emp.father}
              onChange={e => setE("father", e.target.value)}
            />
            <FieldError msg={fieldErrors.father} />
          </Field>

          <Field label="Mother's Name" required>
            <input
              style={fieldErrors.mother ? inputErrorStyle : inputStyle}
              placeholder="Mother's full name"
              value={emp.mother}
              onChange={e => setE("mother", e.target.value)}
            />
            <FieldError msg={fieldErrors.mother} />
          </Field>

          <Field label="Designation" required>
            <input
              style={fieldErrors.designation ? inputErrorStyle : inputStyle}
              placeholder="e.g. Sales Associate"
              value={emp.designation}
              onChange={e => setE("designation", e.target.value)}
            />
            <FieldError msg={fieldErrors.designation} />
          </Field>

          <Field label="Department" required>
            <input
              style={fieldErrors.department ? inputErrorStyle : inputStyle}
              placeholder="e.g. Retail Operations"
              value={emp.department}
              onChange={e => setE("department", e.target.value)}
            />
            <FieldError msg={fieldErrors.department} />
          </Field>

          <Field label="Joining Date" required>
            <input
              style={fieldErrors.joiningDate ? inputErrorStyle : inputStyle}
              type="date"
              value={emp.joiningDate}
              onChange={e => setE("joiningDate", e.target.value)}
            />
            <FieldError msg={fieldErrors.joiningDate} />
          </Field>

          <Field label="Address" full required>
            <input
              style={fieldErrors.address ? inputErrorStyle : inputStyle}
              placeholder="Full residential address"
              value={emp.address}
              onChange={e => setE("address", e.target.value)}
            />
            <FieldError msg={fieldErrors.address} />
          </Field>
        </div>
      </div>

      <div style={{ ...cardStyle, background: "#f8fafc" }}>
        <SectionTitle color="#475569">🪪 ID Card Issuance</SectionTitle>
        <div style={{ background: "linear-gradient(135deg,#534AB7,#3a3293)", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 18, marginBottom: 20, color: "#fff" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, border: "2px solid rgba(255,255,255,.3)", overflow: "hidden", flexShrink: 0 }}>
            {emp.idCardImage
              ? <img src={URL.createObjectURL(emp.idCardImage)} alt="ID" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : (emp.name ? initials(emp.name) : "?")
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{emp.name || "Employee Name"}</div>
            <div style={{ opacity: .8, fontSize: 13 }}>{emp.designation || "Designation"}</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, marginTop: 4 }}>{emp.employeeId || "ID: PENDING"}</div>
          </div>
          <Badge variant={emp.idStatus === "Issued" ? "teal" : emp.idStatus === "Pending" ? "amber" : "pending"}>{emp.idStatus}</Badge>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Employee ID" required>
            <input
              style={fieldErrors.employeeId ? inputErrorStyle : inputStyle}
              placeholder="EMP-2026-001"
              value={emp.employeeId}
              onChange={e => setE("employeeId", e.target.value)}
            />
            <FieldError msg={fieldErrors.employeeId} />
          </Field>
          <Field label="ID Card Status" required>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={emp.idStatus} onChange={e => setE("idStatus", e.target.value)}>
              <option>Not issued</option><option>Issued</option><option>Pending</option>
            </select>
          </Field>
        </div>

        {emp.idStatus === "Not issued" ? (
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 13, color: "#4a5568", fontWeight: 600, display: "block", marginBottom: 6 }}>
              📸 ID Card Photo
              <span style={{ marginLeft: 8, fontSize: 11, color: C.orange[600], fontWeight: 700 }}>(Upload a photo to issue the ID card)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, border: `1.5px dashed ${emp.idCardImage ? C.teal[200] : "#cbd5e0"}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", background: emp.idCardImage ? C.teal[50] : "#fff", color: emp.idCardImage ? C.teal[600] : "#718096", fontSize: 13 }}>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && setE("idCardImage", e.target.files[0])} />
              <span style={{ fontSize: 20 }}>{emp.idCardImage ? "✅" : "📷"}</span>
              <span style={{ fontWeight: 600 }}>{emp.idCardImage ? emp.idCardImage.name : "Click to upload photo (JPG, PNG, etc.)"}</span>
              {emp.idCardImage && (
                <span onClick={e => { e.preventDefault(); setE("idCardImage", null); }} style={{ marginLeft: "auto", color: C.red[600], fontWeight: 700, fontSize: 16, cursor: "pointer" }}>×</span>
              )}
            </label>
            {emp.idCardImage && (
              <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: `2px solid ${C.teal[200]}`, background: "#f0fdf4", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 10 }}>
                <img src={URL.createObjectURL(emp.idCardImage)} alt="ID Card Preview" style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8, display: "block" }} />
                <span style={{ fontSize: 11, color: C.teal[600], fontWeight: 600 }}>✓ Photo preview — this will appear on the ID card</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: emp.idStatus === "Issued" ? C.teal[50] : C.amber[50], border: `1px solid ${emp.idStatus === "Issued" ? C.teal[200] : C.amber[200]}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{emp.idStatus === "Issued" ? "✅" : "⏳"}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: emp.idStatus === "Issued" ? C.teal[600] : C.amber[600] }}>
              {emp.idStatus === "Issued" ? "ID Card has already been issued — no need to upload a photo." : "ID Card is pending — upload a photo once it is issued."}
            </span>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <SectionTitle color={C.green[600]}>✅ Welcome Kit Checklist</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 10 }}>
          {[
            { key: "lunch", label: "Lunch arrangement confirmed" },
            { key: "stationary", label: "Stationary kit provided" },
            { key: "laptop", label: "Laptop / Bag issued" },
            { key: "workstation", label: "Workstation assigned" },
            { key: "credentials", label: "System credentials provided" },
          ].map(item => (
            <div key={item.key} onClick={() => setE("checklist_" + item.key, !emp["checklist_" + item.key])} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1.5px solid ${emp["checklist_" + item.key] ? "#38a169" : "#e2e8f0"}`, borderRadius: 12, cursor: "pointer", background: emp["checklist_" + item.key] ? C.green[50] : "#fff" }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `2px solid ${emp["checklist_" + item.key] ? "#38a169" : "#cbd5e0"}`, background: emp["checklist_" + item.key] ? "#38a169" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>{emp["checklist_" + item.key] ? "✓" : ""}</div>
              <span style={{ fontSize: 13, color: emp["checklist_" + item.key] ? "#2f855a" : "#4a5568", fontWeight: emp["checklist_" + item.key] ? 600 : 500 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── TRAINERS TAB — all fields mandatory ──────────────────────────────────────
function TabTrainers({ trainers, setTrainers, passConfig, setPassConfig, token }) {
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [trainerErrors, setTrainerErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const errors = {};
    if (!name.trim()) errors.name = "Trainer name is required";
    if (!dept) errors.dept = "Department is required";
    if (Object.keys(errors).length) { setTrainerErrors(errors); return; }
    setTrainerErrors({});

    const newTrainer = { name: name.trim(), dept };
    setSaving(true);
    try {
      await fetch(`${API}/api/trainers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newTrainer.name, department: newTrainer.dept }),
      });
    } catch { /* silent */ } finally { setSaving(false); }

    setTrainers(p => [...p, newTrainer]);
    setName(""); setDept("");
  };

  const remove = async (idx) => {
    const t = trainers[idx];
    if (t.id) {
      try { await fetch(`${API}/api/trainers/${t.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); } catch { /* silent */ }
    }
    setTrainers(p => p.filter((_, i) => i !== idx));
  };

  return (
    <>
      <div style={cardStyle}>
        <SectionTitle>👥 HR Trainer Roster</SectionTitle>

        <div style={{ marginBottom: 16, padding: "10px 14px", background: C.amber[50], border: `1px solid ${C.amber[200]}`, borderRadius: 10, fontSize: 12, color: C.amber[600], fontWeight: 600 }}>
          ⓘ Both Name and Department are required when adding a trainer
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <input
              style={trainerErrors.name ? { ...inputErrorStyle } : inputStyle}
              placeholder="Full name *"
              value={name}
              onChange={e => { setName(e.target.value); if (trainerErrors.name) setTrainerErrors(p => ({ ...p, name: "" })); }}
              onKeyDown={e => e.key === "Enter" && add()}
            />
            {trainerErrors.name && <FieldError msg={trainerErrors.name} />}
          </div>
          <div style={{ width: 200 }}>
            <select
              style={trainerErrors.dept ? { ...inputErrorStyle, cursor: "pointer" } : { ...inputStyle, cursor: "pointer" }}
              value={dept}
              onChange={e => { setDept(e.target.value); if (trainerErrors.dept) setTrainerErrors(p => ({ ...p, dept: "" })); }}
            >
              <option value="">Select department *</option>
              {["HR", "Training & Development", "Operations", "IT", "Safety & Compliance", "Retail", "Finance"].map(d => <option key={d}>{d}</option>)}
            </select>
            {trainerErrors.dept && <FieldError msg={trainerErrors.dept} />}
          </div>
          <button onClick={add} disabled={saving} style={{ padding: "9px 18px", background: saving ? "#94a3b8" : C.purple[600], color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "..." : "+ Add"}
          </button>
        </div>

        <div style={{ marginBottom: 16 }} />

        {trainers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "#a0aec0", border: "1.5px dashed #e2e8f0", borderRadius: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
            <div style={{ fontSize: 13 }}>No trainers added yet. Add trainers above.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {trainers.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: C.purple[50], border: `1px solid ${C.purple[200]}`, borderRadius: 20 }}>
                <span style={{ fontSize: 13, color: C.purple[800], fontWeight: 600 }}>{t.name}</span>
                <span style={{ fontSize: 11, color: C.purple[400] }}>· {t.dept}</span>
                <span onClick={() => remove(i)} style={{ cursor: "pointer", color: "#a0aec0", fontSize: 16, lineHeight: 1 }}>×</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <SectionTitle>⚙️ Pass Mark Configuration</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
          <Field label="Pass Mark (%)" required><input style={inputStyle} type="number" min="0" max="100" value={passConfig.passMark} onChange={e => setPassConfig(p => ({ ...p, passMark: Number(e.target.value) }))} /></Field>
          <Field label="Max Marks" required><input style={inputStyle} type="number" min="1" value={passConfig.maxMarks} onChange={e => setPassConfig(p => ({ ...p, maxMarks: Number(e.target.value) }))} /></Field>
          <Field label="Re-attempt" required>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={passConfig.reattempt} onChange={e => setPassConfig(p => ({ ...p, reattempt: e.target.value }))}>
              <option>Yes</option><option>No</option>
            </select>
          </Field>
        </div>
      </div>
    </>
  );
}

// ── MODULE CARD — all fields required for mandatory modules ──────────────────
function ModuleCard({ config, value, onChange, trainers, passMark, maxMarks, isHR, showErrors }) {
  const { label, days, group } = config;
  const g = GROUPS.find(g => g.key === group) || GROUPS[0];
  const marks = Number(value.marks) || 0;
  const pct = value.marks ? Math.round((marks / maxMarks) * 100) : null;
  const isPassed = pct !== null && pct >= passMark;
  const isFailed = pct !== null && pct < passMark;

  // missing fields for mandatory modules
  const missingDates = value.mandatory && value.dates.some(d => !d);
  const missingTrainer = value.mandatory && !value.trainer;
  const missingQuestions = value.mandatory && !value.questions;
  const missingResult = value.mandatory && !value.resultSheet;
  const missingMarks = value.mandatory && !value.marks;

  const hasMissing = showErrors && value.mandatory && (missingDates || missingTrainer || missingQuestions || missingResult || missingMarks);

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${hasMissing ? C.red[200] : isFailed ? C.red[200] : isPassed ? C.green[200] : value.mandatory ? C.orange[200] : "#edf2f7"}`, borderRadius: 14, padding: "14px", boxShadow: hasMissing ? `0 0 0 3px ${C.red[50]}` : "0 1px 4px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: g.accent, flex: 1 }}>{label}</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: g.accent, padding: "2px 8px", borderRadius: 20 }}>{days}D</span>
          {value.mandatory && <Badge variant="mandatory">MANDATORY</Badge>}
          {pct !== null && <Badge variant={isPassed ? "pass" : "fail"}>{isPassed ? "PASS" : "FAIL"}</Badge>}
        </div>
      </div>

      {isHR && (
        <div onClick={() => onChange("mandatory", !value.mandatory)} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "6px 10px", borderRadius: 8, cursor: "pointer", background: value.mandatory ? C.orange[50] : "#f8fafc", border: `1px solid ${value.mandatory ? C.orange[200] : "#e2e8f0"}` }}>
          <div style={{ width: 34, height: 18, borderRadius: 9, flexShrink: 0, position: "relative", background: value.mandatory ? C.orange[600] : "#cbd5e0" }}>
            <div style={{ position: "absolute", top: 2, left: value.mandatory ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: value.mandatory ? C.orange[600] : "#718096" }}>{value.mandatory ? "Mandatory" : "Optional"}</span>
        </div>
      )}

      {/* Dates */}
      {Array.from({ length: days }, (_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: "#718096", minWidth: 42 }}>
            Day {i + 1}{value.mandatory && <span style={{ color: C.red[600] }}>*</span>}
          </label>
          <input
            type="date"
            style={{ ...(showErrors && value.mandatory && !value.dates[i] ? { ...inputErrorStyle, padding: "5px 8px", fontSize: 12 } : { ...inputStyle, padding: "5px 8px", fontSize: 12 }) }}
            value={value.dates[i] || ""}
            onChange={e => { const d = [...value.dates]; d[i] = e.target.value; onChange("dates", d); }}
          />
        </div>
      ))}

      {/* Trainer */}
      <div style={{ marginTop: 4 }}>
        <label style={{ fontSize: 11, color: "#718096", display: "block", marginBottom: 3 }}>
          Trainer{value.mandatory && <span style={{ color: C.red[600] }}>*</span>}
        </label>
        <select
          style={{ ...(showErrors && missingTrainer ? { ...inputErrorStyle, padding: "5px 8px", fontSize: 12, cursor: "pointer" } : { ...inputStyle, padding: "5px 8px", fontSize: 12, cursor: "pointer" }) }}
          value={value.trainer}
          onChange={e => onChange("trainer", e.target.value)}
        >
          <option value="">— Assign Trainer —</option>
          {trainers.length === 0 ? (
            <option disabled>No trainers added yet</option>
          ) : (
            trainers.map((t, i) => {
              const deptLabel = t.department || t.dept || "";
              return <option key={i} value={t.name}>{t.name}{deptLabel ? ` · ${deptLabel}` : ""}</option>;
            })
          )}
        </select>
        {showErrors && missingTrainer && <FieldError msg="Trainer is required for mandatory module" />}
      </div>

      {/* Files */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
        <div>
          <UploadZone label="📄 Question paper" file={value.questions} accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" required={value.mandatory} missing={showErrors && missingQuestions} onFile={f => onChange("questions", f)} />
          {showErrors && missingQuestions && <FieldError msg="Required for mandatory module" />}
          <FilePreview file={value.questions} height={100} />
        </div>
        <div>
          <UploadZone label="📊 Result sheet" file={value.resultSheet} accept="image/*,.pdf,.doc,.docx,.xlsx,.csv" required={value.mandatory} missing={showErrors && missingResult} onFile={f => onChange("resultSheet", f)} />
          {showErrors && missingResult && <FieldError msg="Required for mandatory module" />}
          <FilePreview file={value.resultSheet} height={100} />
        </div>
      </div>

      {/* Marks */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <label style={{ fontSize: 12, color: "#718096" }}>
          Marks{value.mandatory && <span style={{ color: C.red[600] }}>*</span>}:
        </label>
        <input
          type="number" min="0" max={maxMarks}
          style={{ ...(showErrors && missingMarks ? { ...inputErrorStyle, width: 70, textAlign: "center", padding: "5px 8px", fontSize: 13 } : { ...inputStyle, width: 70, textAlign: "center", padding: "5px 8px", fontSize: 13 }) }}
          value={value.marks}
          onChange={e => onChange("marks", e.target.value)}
        />
        <span style={{ fontSize: 12, color: "#a0aec0" }}>/ {maxMarks}</span>
        {pct !== null && <span style={{ fontSize: 12, fontWeight: 700, color: isPassed ? C.green[600] : C.red[600], marginLeft: "auto" }}>{pct}%</span>}
      </div>
      {showErrors && missingMarks && <FieldError msg="Marks are required for mandatory module" />}
      {pct !== null && <div style={{ height: 5, background: "#edf2f7", borderRadius: 4, marginTop: 8, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: isPassed ? "#639922" : "#E24B4A", borderRadius: 4 }} /></div>}
    </div>
  );
}

function CollapsibleGroup({ group, mods, modules, update, trainers, passConfig, isHR, showErrors }) {
  const [open, setOpen] = useState(true);
  const mandatoryCount = mods.filter(m => modules[m.key].mandatory).length;
  const missingCount = mods.filter(m => {
    const mv = modules[m.key];
    return mv.mandatory && (mv.dates.some(d => !d) || !mv.trainer || !mv.questions || !mv.resultSheet || !mv.marks);
  }).length;

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: group.bg, border: `1px solid ${group.border}`, borderRadius: open ? "12px 12px 0 0" : 12, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 11, color: group.accent, transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .2s" }}>▶</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: group.accent, flex: 1 }}>{group.label}</span>
        <span style={{ fontSize: 11, color: group.accent, opacity: .7 }}>{mods.length} modules</span>
        {mandatoryCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.orange[600], background: C.orange[50], padding: "2px 8px", borderRadius: 10 }}>{mandatoryCount} mandatory</span>}
        {showErrors && missingCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.red[600], background: C.red[50], padding: "2px 8px", borderRadius: 10 }}>⚠ {missingCount} incomplete</span>}
      </div>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10, padding: "12px", background: "#fafafa", border: `1px solid ${group.border}`, borderTop: "none", borderRadius: "0 0 12px 12px" }}>
          {mods.map(config => (
            <ModuleCard
              key={config.key}
              config={config}
              value={modules[config.key]}
              onChange={(field, val) => update(config.key, field, val)}
              trainers={trainers}
              passMark={passConfig.passMark}
              maxMarks={passConfig.maxMarks}
              isHR={isHR}
              showErrors={showErrors}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabModules({ modules, setModules, trainers, passConfig, isHR, showErrors }) {
  const update = useCallback((key, field, val) => { setModules(p => ({ ...p, [key]: { ...p[key], [field]: val } })); }, [setModules]);
  const trained = TRAINING_CONFIG.filter(({ key }) => modules[key]?.dates?.some(Boolean) || modules[key]?.marks).length;
  const pct = Math.round((trained / TRAINING_CONFIG.length) * 100);

  const totalMandatory = TRAINING_CONFIG.filter(({ key }) => modules[key].mandatory).length;
  const completedMandatory = TRAINING_CONFIG.filter(({ key }) => {
    const mv = modules[key];
    return mv.mandatory && mv.dates.every(d => d) && mv.trainer && mv.questions && mv.resultSheet && mv.marks;
  }).length;

  return (
    <>
      <div style={{ ...cardStyle, padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: "#64748b" }}>Overall training progress</span>
          <span style={{ color: C.purple[600], fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: "#edf2f7", borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: C.purple[600], borderRadius: 6, transition: "width .5s" }} /></div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{trained} of {TRAINING_CONFIG.length} modules started</div>

        {totalMandatory > 0 && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: completedMandatory === totalMandatory ? C.green[50] : C.orange[50], borderRadius: 8, border: `1px solid ${completedMandatory === totalMandatory ? C.green[200] : C.orange[200]}`, fontSize: 12, color: completedMandatory === totalMandatory ? C.green[600] : C.orange[600], fontWeight: 600 }}>
            {completedMandatory === totalMandatory ? "✅" : "⚠️"} Mandatory modules: {completedMandatory}/{totalMandatory} fully completed
          </div>
        )}
      </div>

      {trainers.length === 0 && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: C.amber[50], border: `1px solid ${C.amber[200]}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ fontSize: 13, color: C.amber[600], fontWeight: 600 }}>
            No trainers added yet. Go to <strong>Trainers</strong> tab to add trainers before assigning modules.
          </span>
        </div>
      )}

      {GROUPS.map(group => (
        <CollapsibleGroup
          key={group.key}
          group={group}
          mods={TRAINING_CONFIG.filter(m => m.group === group.key)}
          modules={modules}
          update={update}
          trainers={trainers}
          passConfig={passConfig}
          isHR={isHR}
          showErrors={showErrors}
        />
      ))}
    </>
  );
}

// ── DOCUMENTS TAB — mandatory upload ─────────────────────────────────────────
function TabDocuments({ docs, setDocs, showErrors }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("General");

  const add = files => {
    const newDocs = Array.from(files).map(f => ({
      id: Date.now() + Math.random(),
      title: title || f.name,
      file: f,
      cat,
      date: new Date().toLocaleDateString("en-IN"),
      size: (f.size / 1024).toFixed(1) + " KB",
    }));
    setDocs(p => [...p, ...newDocs]);
    setTitle("");
  };

  const hasNoDocs = docs.length === 0;

  return (
    <>
      <div style={cardStyle}>
        <SectionTitle>📂 Upload Training Documents</SectionTitle>

        {/* Mandatory notice */}
        <div style={{ marginBottom: 14, padding: "10px 14px", background: hasNoDocs && showErrors ? C.red[50] : C.teal[50], border: `1px solid ${hasNoDocs && showErrors ? C.red[200] : C.teal[200]}`, borderRadius: 10, fontSize: 12, color: hasNoDocs && showErrors ? C.red[600] : C.teal[600], fontWeight: 600 }}>
          {hasNoDocs && showErrors
            ? "⚠ At least one document must be uploaded"
            : "ⓘ Please upload at least one training document"
          }
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12, marginBottom: 12 }}>
          <Field label="Document title (optional)">
            <input style={inputStyle} placeholder="e.g. HR Policy Manual 2026" value={title} onChange={e => setTitle(e.target.value)} />
          </Field>
          <Field label="Category">
            <select style={{ ...inputStyle, cursor: "pointer" }} value={cat} onChange={e => setCat(e.target.value)}>
              <option>Induction</option><option>Product & Customer</option><option>Safety</option><option>General</option>
            </select>
          </Field>
        </div>

        <label style={{ display: "block", border: `2px dashed ${hasNoDocs && showErrors ? C.red[200] : "#cbd5e0"}`, borderRadius: 12, padding: 18, textAlign: "center", cursor: "pointer", background: hasNoDocs && showErrors ? C.red[50] : "#f8fafc" }}>
          <input type="file" multiple style={{ display: "none" }} onChange={e => add(e.target.files)} />
          <div style={{ fontSize: 14, color: C.purple[600], fontWeight: 700 }}>📁 Click to choose files</div>
          <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 4 }}>PDF, DOCX, PPTX, XLSX, Images — At least 1 file required</div>
        </label>
      </div>

      {docs.length > 0 && (
        <div style={cardStyle}>
          <SectionTitle>📋 Uploaded Documents ({docs.length})</SectionTitle>
          {docs.map(d => (
            <div key={d.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", border: "1px solid #edf2f7", borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: "#a0aec0" }}>{d.file instanceof File ? d.file.name : d.file} · {d.size} · {d.cat}</div>
                </div>
                <button onClick={() => setDocs(p => p.filter(x => x.id !== d.id))} style={{ padding: "4px 10px", fontSize: 12, background: C.red[50], color: C.red[600], border: `1px solid ${C.red[200]}`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
              </div>
              <FilePreview file={d.file} height={140} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function OnboardingForm({ onSubmit }) {
  const [token, setToken] = useState(() => localStorage.getItem("hr_token") || "");
  const [hrName, setHrName] = useState(() => localStorage.getItem("hr_fullname") || "");
  const [page, setPage] = useState("dashboard");
  const [viewId, setViewId] = useState(null);
  const [tab, setTab] = useState("employee");
  const [isHR, setIsHR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const emptyEmp = {
    name: "", email: "", phone: "", address: "", father: "", mother: "",
    department: "", designation: "", employeeId: "", idStatus: "Not issued",
    idCardImage: null, joiningDate: "",
    checklist_lunch: false, checklist_stationary: false,
    checklist_laptop: false, checklist_workstation: false, checklist_credentials: false,
  };

  const [emp, setEmpState] = useState(emptyEmp);
  const [trainers, setTrainers] = useState([]);
  const [passConfig, setPassConfig] = useState({ passMark: 70, maxMarks: 100, reattempt: "Yes" });
  const [modules, setModules] = useState(buildEmptyModules());
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/trainers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTrainers(data.map(t => ({ id: t.id, name: t.name, dept: t.department })));
        }
      })
      .catch(() => {
        setTrainers([
          { name: "Priya Sen", dept: "HR" },
          { name: "Arun Kumar", dept: "Training & Development" },
          { name: "Meera Mukherjee", dept: "Safety & Compliance" },
        ]);
      });
  }, [token]);

  const setE = (k, v) => setEmpState(p => ({ ...p, [k]: v }));
  const logout = () => { localStorage.removeItem("hr_token"); localStorage.removeItem("hr_fullname"); setToken(""); setHrName(""); };

  if (!token) return <LoginPage onLogin={(t, n) => { setToken(t); setHrName(n); }} />;
  if (page === "view") return <EmployeeView empId={viewId} token={token} onBack={() => setPage("dashboard")} />;
  if (page === "dashboard") return (
    <EmployeeDashboard token={token} hrName={hrName} onLogout={logout}
      onNewEmployee={() => { setEmpState(emptyEmp); setModules(buildEmptyModules()); setDocs([]); setError(""); setSubmitted(false); setTab("employee"); setShowErrors(false); setFieldErrors({}); setPage("new"); }}
      onViewEmployee={(id) => { setViewId(id); setPage("view"); }}
    />
  );

  // ── Full validation ───────────────────────────────────────────────────────
  const validateAll = () => {
    const errors = {};

    // Employee fields
    if (!emp.name.trim()) errors.name = "Name is required";
    if (!emp.email.trim()) errors.email = "Email is required";
    else if (!validateEmail(emp.email)) errors.email = "Only @gmail.com email is accepted (e.g. name@gmail.com)";
    if (!emp.phone) errors.phone = "Phone number is required";
    else if (!validatePhone(emp.phone)) errors.phone = "Phone must be exactly 10 digits";
    if (!emp.father.trim()) errors.father = "Father's name is required";
    if (!emp.mother.trim()) errors.mother = "Mother's name is required";
    if (!emp.designation.trim()) errors.designation = "Designation is required";
    if (!emp.department.trim()) errors.department = "Department is required";
    if (!emp.joiningDate) errors.joiningDate = "Joining date is required";
    if (!emp.address.trim()) errors.address = "Address is required";
    if (!emp.employeeId.trim()) errors.employeeId = "Employee ID is required";

    return errors;
  };

  // mandatory modules check
  const mandatoryModuleErrors = TRAINING_CONFIG.filter(({ key }) => {
    const mv = modules[key];
    if (!mv.mandatory) return false;
    return mv.dates.some(d => !d) || !mv.trainer || !mv.questions || !mv.resultSheet || !mv.marks;
  });

  const hasDocError = docs.length === 0;
  const hasTrainerError = trainers.length === 0;

  const handleSubmit = async () => {
    setShowErrors(true);
    const errors = validateAll();
    setFieldErrors(errors);

    const allErrors = [];
    if (Object.keys(errors).length > 0) allErrors.push("Some fields in the Employee Info tab are incomplete");
    if (hasTrainerError) allErrors.push("Please add at least one trainer");
    if (mandatoryModuleErrors.length > 0) allErrors.push(`Mandatory modules incomplete: ${mandatoryModuleErrors.map(m => m.label).join(", ")}`);
    if (hasDocError) allErrors.push("Please upload at least one document");

    if (allErrors.length > 0) {
      setError(allErrors.join(" | "));
      return;
    }

    setLoading(true); setError("");

    try {
      const fd = new FormData();
      if (emp.idCardImage instanceof File) fd.append("id_card_image", emp.idCardImage);
      for (const [key, mv] of Object.entries(modules)) {
        if (mv.questions instanceof File) fd.append(`questions_${key}`, mv.questions);
        if (mv.resultSheet instanceof File) fd.append(`result_${key}`, mv.resultSheet);
      }
      docs.forEach((d, i) => { if (d.file instanceof File) fd.append(`doc_${i}`, d.file); });

      const payload = {
        emp: { ...emp, idCardImage: emp.idCardImage instanceof File ? emp.idCardImage.name : null },
        modules: Object.fromEntries(Object.entries(modules).map(([k, v]) => [k, {
          ...v,
          questions: v.questions instanceof File ? v.questions.name : (v.questions || null),
          resultSheet: v.resultSheet instanceof File ? v.resultSheet.name : (v.resultSheet || null),
        }])),
        trainers, passConfig,
        docs: docs.map((d, i) => ({ title: d.title, cat: d.cat, file: d.file instanceof File ? d.file.name : d.file, index: i })),
      };
      fd.append("data", JSON.stringify(payload));

      const res = await fetch(`${API}/api/onboarding`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.status === 401) { logout(); return; }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Server error");
      }

      const saved = await res.json();
      onSubmit?.({ ...payload, id: saved.id });
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setPage("dashboard"); }, 2000);
    } catch (e) {
      setError(e.message || "Failed to save. Please check if the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Tab-level error indicators
  const empTabHasError = showErrors && Object.keys(fieldErrors).length > 0;
  const trainerTabHasError = showErrors && hasTrainerError;
  const moduleTabHasError = showErrors && mandatoryModuleErrors.length > 0;
  const docTabHasError = showErrors && hasDocError;

  return (
    <div style={{ maxWidth: 980, margin: "auto", padding: "24px 20px", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setPage("dashboard")} style={{ padding: "8px 14px", background: C.purple[50], color: C.purple[600], border: `1px solid ${C.purple[200]}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", marginTop:"-40px" }}>← Dashboard</button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a202c", margin: 0 }}>New Employee Onboarding</h1>
            <p style={{ fontSize: 13, color: "#718096", marginTop: 2 }}>Complete all sections to finish onboarding</p>
          </div>
        </div>
        <div onClick={() => setIsHR(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: isHR ? C.orange[50] : "#f8fafc", border: `1.5px solid ${isHR ? C.orange[200] : "#e2e8f0"}`, borderRadius: 10, cursor: "pointer", userSelect: "none" }}>
          <div style={{ width: 34, height: 18, borderRadius: 9, position: "relative", background: isHR ? C.orange[600] : "#cbd5e0" }}><div style={{ position: "absolute", top: 2, left: isHR ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} /></div>
          <span style={{ fontSize: 12, fontWeight: 700, color: isHR ? C.orange[600] : "#718096" }}>{isHR ? "HR Mode ON" : "HR Mode"}</span>
        </div>
      </div>

      {/* Tab bar with error indicators */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #edf2f7", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {[
          { key: "employee",  label: "👤 Employee Info",   hasError: empTabHasError },
          { key: "trainers",  label: `👥 Trainers ${trainers.length > 0 ? `(${trainers.length})` : ""}`, hasError: trainerTabHasError },
          { key: "modules",   label: "📋 Training Modules", hasError: moduleTabHasError },
          { key: "documents", label: "📂 Documents",        hasError: docTabHasError },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? C.purple[600] : t.hasError ? C.red[600] : "#718096", background: "transparent", border: "none", borderBottom: tab === t.key ? `2px solid ${C.purple[600]}` : "2px solid transparent", cursor: "pointer", marginBottom: -2, fontFamily: "inherit", position: "relative" }}>
            {t.label}
            {t.hasError && <span style={{ marginLeft: 5, fontSize: 10, color: "#fff", background: C.red[600], padding: "1px 5px", borderRadius: 8, fontWeight: 800 }}>!</span>}
          </button>
        ))}
      </div>

      {tab === "employee"  && <TabEmployee emp={emp} setE={setE} fieldErrors={showErrors ? fieldErrors : {}} />}
      {tab === "trainers"  && <TabTrainers trainers={trainers} setTrainers={setTrainers} passConfig={passConfig} setPassConfig={setPassConfig} token={token} />}
      {tab === "modules"   && <TabModules modules={modules} setModules={setModules} trainers={trainers} passConfig={passConfig} isHR={isHR} showErrors={showErrors} />}
      {tab === "documents" && <TabDocuments docs={docs} setDocs={setDocs} showErrors={showErrors} />}

      {showErrors && error && (
        <div style={{ background: C.red[50], border: `1px solid ${C.red[200]}`, borderRadius: 10, padding: "12px 16px", color: C.red[600], fontSize: 13, marginBottom: 12 }}>
          ❌ {error}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: 15, background: loading ? "#94a3b8" : C.purple[600], color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(83,74,183,.3)" }}>
        {loading ? "Saving..." : "✅ Complete Onboarding Process"}
      </button>

      {submitted && (
        <div style={{ background: C.green[50], border: `1px solid ${C.green[200]}`, borderRadius: 12, padding: 16, color: C.green[600], fontSize: 15, marginTop: "1rem", textAlign: "center", fontWeight: 700 }}>
          🎉 Saved! Redirecting to dashboard...
        </div>
      )}
    </div>
  );
}