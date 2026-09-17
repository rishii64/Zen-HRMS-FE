import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import OnboardingForm from "./onboarding";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const roundDefs = [
  {
    label: "Round 1 — HR Round", key: "hr", owner: "hr",
    criteria: [
      { name: "Personality test",    key: "personality" },
      { name: "English knowledge",   key: "english" },
      { name: "Behavior / attitude",key: "behavior" },
      { name: "Communication skills",key: "communication" },
      { name: "Cultural fitment",    key: "cultural" },
    ],
  },
  {
    label: "Round 2 — Technical Round", key: "tech", owner: "hod",
    criteria: [
      { name: "Domain knowledge",        key: "domain" },
      { name: "Analytical knowledge",    key: "analytical" },
      { name: "Technical / job skill",   key: "technical" },
      { name: "Problem solving ability", key: "problem" },
      { name: "Aptitude & reasoning",    key: "aptitude" },
    ],
  },
  {
    label: "Round 3 — Final Round", key: "final", owner: "hod",
    criteria: [
      { name: "Leadership ability",  key: "leadership" },
      { name: "Team collaboration",  key: "teamwork" },
      { name: "Strategic thinking",  key: "strategic" },
      { name: "Motivation & drive",  key: "motivation" },
      { name: "Overall impression",  key: "overall_imp" },
    ],
  },
];

const gradeColors = {
  A: { bg: "#EAF3DE", color: "#3B6D11" },
  B: { bg: "#E6F1FB", color: "#185FA5" },
  C: { bg: "#FAEEDA", color: "#854F0B" },
  D: { bg: "#FBEAF0", color: "#993556" },
  F: { bg: "#FCEBEB", color: "#A32D2D" },
};

const verdictColors = {
  Selected:  { bg: "#EAF3DE", color: "#3B6D11" },
  "On Hold": { bg: "#FAEEDA", color: "#854F0B" },
  Rejected:  { bg: "#FCEBEB", color: "#A32D2D" },
};

const API_BASE = "http://localhost:3001/api";

function gradeToNum(g) { return { A: 5, B: 4, C: 3, D: 2, F: 1 }[g] || 0; }
function numToGrade(n) {
  if (n >= 4.5) return "A"; if (n >= 3.5) return "B";
  if (n >= 2.5) return "C"; if (n >= 1.5) return "D"; return "F";
}
function getInitials(name) {
  const w = (name || "").trim().split(" ").filter(Boolean);
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
  if (w.length === 1) return w[0][0].toUpperCase();
  return "?";
}
function today() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────

function Badge({ grade }) {
  const s = gradeColors[grade] || { bg: "#f0f0f0", color: "#888" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 28, padding: "2px 8px", borderRadius: 100,
      fontSize: 12, fontWeight: 500, background: s.bg, color: s.color,
    }}>{grade || "—"}</span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: "#534AB7", textTransform: "uppercase",
      letterSpacing: "0.08em", marginBottom: "1rem",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      {children}
      <span style={{ flex: 1, height: "0.5px", background: "#e5e5e5" }} />
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "white", border: "0.5px solid #e5e5e5", borderRadius: 12,
      padding: "1.5rem", marginBottom: "1rem", ...style,
    }}>{children}</div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: "#f8f8f8", border: "0.5px solid #e0e0e0", borderRadius: 8,
  padding: "9px 12px", fontSize: 14, color: "#222", outline: "none",
  width: "100%", boxSizing: "border-box", fontFamily: "inherit",
};
const thStyle = {
  fontSize: 12, fontWeight: 500, color: "#888", textAlign: "left",
  padding: "8px 10px", background: "#f8f8f8", borderBottom: "1px solid #e5e5e5",
};
const tdStyle = {
  padding: "8px 10px", borderBottom: "0.5px solid #f0f0f0",
  verticalAlign: "middle", fontSize: 14, color: "#222",
};

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid email or password."); }
      else { onLogin(data); }
    } catch {
      setError("Cannot connect to server. Make sure backend is running.");
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "2rem 1rem",
      background: "#f4f4f7", fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{
          background: "linear-gradient(135deg,#534AB7,#7F77DD)", borderRadius: 12,
          padding: "2rem", marginBottom: "1.5rem", textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, background: "rgba(255,255,255,0.2)",
            borderRadius: "50%", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 1rem",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div style={{ color: "white", fontSize: 20, fontWeight: 500, marginBottom: 4 }}>
            Interview Assessment System
          </div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>Sign in to continue</div>
        </div>

        <div style={{ background: "white", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: "1.75rem" }}>
          <Field label="Email address">
            <input style={inputStyle} type="email" placeholder="Enter your email"
              value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown} />
          </Field>
          <div style={{ height: 12 }} />
          <Field label="Password">
            <div style={{ position: "relative" }}>
              <input
                style={{ ...inputStyle, paddingRight: 56 }}
                type={showPwd ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
              />
              <button onClick={() => setShowPwd(v => !v)} style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#888", fontSize: 12,
                cursor: "pointer", fontFamily: "inherit", padding: "4px 6px",
              }}>{showPwd ? "Hide" : "Show"}</button>
            </div>
          </Field>
          {error && (
            <div style={{ background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: 8, padding: "10px 12px", color: "#A32D2D", fontSize: 13, marginTop: 12 }}>{error}</div>
          )}
          <button onClick={handleSubmit} disabled={loading} style={{
            width: "100%", padding: 12, marginTop: 16,
            background: loading ? "#9990d6" : "#534AB7",
            color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}>{loading ? "Signing in..." : "Sign in"}</button>
          <div style={{ marginTop: "1rem", fontSize: 12, color: "#aaa", textAlign: "center" }}>
            Credentials are stored securely in the database
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

function UserManagement() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [form, setForm]               = useState({ email: "", password: "", name: "", role: "hr", label: "" });
  const [formError, setFormError]     = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [pwdModal, setPwdModal]       = useState(null);
  const [newPwd, setNewPwd]           = useState("");
  const [pwdError, setPwdError]       = useState("");
  const [successMsg, setSuccessMsg]   = useState("");

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); };

  const fetchUsers = async () => {
    setLoading(true);
    try { const res = await fetch(`${API_BASE}/auth/users`); setUsers(await res.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async () => {
    if (!form.email || !form.password || !form.name) { setFormError("Email, password and name are required."); return; }
    setFormLoading(true); setFormError("");
    try {
      const res = await fetch(`${API_BASE}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Failed"); }
      else { setForm({ email: "", password: "", name: "", role: "hr", label: "" }); setShowAdd(false); fetchUsers(); flash("✅ User added successfully!"); }
    } catch { setFormError("Network error"); }
    setFormLoading(false);
  };

  const handleToggle = async (id, current) => {
    await fetch(`${API_BASE}/auth/users/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !current }) });
    fetchUsers(); flash(current ? "User deactivated" : "User activated");
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    await fetch(`${API_BASE}/auth/users/${id}`, { method: "DELETE" });
    fetchUsers(); flash("User deleted.");
  };

  const handlePwdChange = async () => {
    if (!newPwd || newPwd.length < 4) { setPwdError("Minimum 4 characters."); return; }
    const res = await fetch(`${API_BASE}/auth/users/${pwdModal.id}/password`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: newPwd }) });
    if (res.ok) { setPwdModal(null); setNewPwd(""); setPwdError(""); flash("✅ Password updated!"); }
    else { setPwdError("Failed to update password."); }
  };

  const roleColors = { admin: { bg: "#EEEDFE", color: "#534AB7" }, hr: { bg: "#E6F1FB", color: "#185FA5" }, hod: { bg: "#FAEEDA", color: "#854F0B" } };

  return (
    <>
      {pwdModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, padding: "1.5rem", maxWidth: 380, width: "100%" }}>
            <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 12 }}>Change password — {pwdModal.name}</div>
            <Field label="New password"><input style={inputStyle} type="password" placeholder="Enter new password" value={newPwd} onChange={e => { setNewPwd(e.target.value); setPwdError(""); }} /></Field>
            {pwdError && <div style={{ color: "#A32D2D", fontSize: 13, marginTop: 8 }}>{pwdError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={handlePwdChange} style={{ flex: 1, padding: "9px", background: "#534AB7", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Update password</button>
              <button onClick={() => { setPwdModal(null); setNewPwd(""); setPwdError(""); }} style={{ padding: "9px 16px", background: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <SectionLabel>👥 User Management</SectionLabel>
          <button onClick={() => setShowAdd(v => !v)} style={{ padding: "7px 16px", background: "#534AB7", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>+ Add User</button>
        </div>
        {successMsg && <div style={{ background: "#EAF3DE", border: "0.5px solid #97C459", borderRadius: 8, padding: "10px 14px", color: "#3B6D11", fontSize: 13, marginBottom: 12 }}>{successMsg}</div>}
        {showAdd && (
          <div style={{ background: "#f8f8f8", border: "0.5px solid #e0e0e0", borderRadius: 10, padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 500, fontSize: 14, color: "#534AB7", marginBottom: 12 }}>New User Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Full name"><input style={inputStyle} placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
              <Field label="Email"><input style={inputStyle} type="email" placeholder="user@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Field>
              <Field label="Password"><input style={inputStyle} type="password" placeholder="Min 4 characters" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></Field>
              <Field label="Role">
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="admin">Admin</option><option value="hr">HR Manager</option><option value="hod">HOD</option>
                </select>
              </Field>
              <Field label="Label (optional)"><input style={inputStyle} placeholder="e.g. Senior HR Manager" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} /></Field>
            </div>
            {formError && <div style={{ color: "#A32D2D", fontSize: 13, marginTop: 8 }}>{formError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={handleAdd} disabled={formLoading} style={{ padding: "9px 20px", background: formLoading ? "#9990d6" : "#534AB7", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{formLoading ? "Saving..." : "Add user"}</button>
              <button onClick={() => { setShowAdd(false); setFormError(""); }} style={{ padding: "9px 14px", background: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: "center", color: "#888", padding: "1.5rem", fontSize: 14 }}>Loading users...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={thStyle}>Name</th><th style={thStyle}>Email</th><th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th><th style={thStyle}>Last login</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
            </tr></thead>
            <tbody>
              {users.map(u => {
                const rc = roleColors[u.role] || { bg: "#f0f0f0", color: "#888" };
                return (
                  <tr key={u.id}>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: rc.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{getInitials(u.name)}</div>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 13, color: "#555" }}>{u.email}</td>
                    <td style={tdStyle}><span style={{ background: rc.bg, color: rc.color, padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 500 }}>{u.label || u.role}</span></td>
                    <td style={tdStyle}><span style={{ background: u.is_active ? "#EAF3DE" : "#f0f0f0", color: u.is_active ? "#3B6D11" : "#888", padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 500 }}>{u.is_active ? "Active" : "Inactive"}</span></td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#888" }}>{u.last_login ? new Date(u.last_login).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                        <button onClick={() => { setPwdModal({ id: u.id, name: u.name }); setNewPwd(""); }} style={{ padding: "5px 10px", background: "#E6F1FB", color: "#185FA5", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🔑 Password</button>
                        <button onClick={() => handleToggle(u.id, u.is_active)} style={{ padding: "5px 10px", background: u.is_active ? "#FAEEDA" : "#EAF3DE", color: u.is_active ? "#854F0B" : "#3B6D11", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{u.is_active ? "Deactivate" : "Activate"}</button>
                        <button onClick={() => handleDelete(u.id, u.name)} style={{ padding: "5px 10px", background: "#FCEBEB", color: "#A32D2D", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🗑 Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

// ─── PDF VIEWER MODAL ─────────────────────────────────────────────────────────

function PdfViewerModal({ pdfUrl, fileName, onClose }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.65)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 16, maxWidth: 820, width: "100%", height: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "0.5px solid #e5e5e5", background: "#f8f8f8", borderRadius: "16px 16px 0 0" }}>
          <div style={{ fontWeight: 500, fontSize: 14, color: "#222" }}>Offer Letter — {fileName}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={pdfUrl} download={fileName} style={{ padding: "7px 14px", background: "#534AB7", color: "white", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>⬇ Download</a>
            <button onClick={onClose} style={{ padding: "7px 14px", background: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Close</button>
          </div>
        </div>
        <iframe src={pdfUrl} title="Offer Letter PDF" style={{ flex: 1, border: "none", width: "100%" }} />
      </div>
    </div>
  );
}

// ─── PRINT REPORT ─────────────────────────────────────────────────────────────

function buildPrintHTML(report) {
  const vc = verdictColors[report.verdict]    || { bg: "#eee",    color: "#888" };
  const gc = gradeColors[report.overallGrade] || { bg: "#f0f0f0", color: "#888" };

  const roundRows = roundDefs.map((rd, ri) => {
    const rows = rd.criteria.map((c, ci) => {
      const g   = report.roundGrades?.[ri]?.[c.key] || "";
      const gc2 = gradeColors[g] || { bg: "#f0f0f0", color: "#888" };
      return `<tr>
        <td style="padding:7px 10px;border-bottom:0.5px solid #f0f0f0;color:#aaa;font-size:12px;width:32px">${ci + 1}</td>
        <td style="padding:7px 10px;border-bottom:0.5px solid #f0f0f0;font-size:13px;color:#222">${c.name}</td>
        <td style="padding:7px 10px;border-bottom:0.5px solid #f0f0f0;text-align:center">
          <span style="display:inline-block;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:500;background:${gc2.bg};color:${gc2.color}">${g || "—"}</span>
        </td></tr>`;
    }).join("");
    const isHr = ri === 0;
    const roundComment = report.roundComments?.[ri]
      ? `<div style="background:#f8f8f8;border-radius:8px;padding:10px 12px;margin-top:8px;font-size:12px;color:#444;line-height:1.6">
           <span style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px">Round ${ri + 1} comments</span>
           ${report.roundComments[ri]}</div>` : "";
    return `<div style="margin-bottom:18px">
      <div style="font-weight:500;font-size:12px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;color:${isHr ? "#185FA5" : "#854F0B"}">${rd.label}</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="font-size:11px;font-weight:500;color:#888;text-align:left;padding:6px 10px;background:#f8f8f8;border-bottom:1px solid #e5e5e5;width:32px">#</th>
          <th style="font-size:11px;font-weight:500;color:#888;text-align:left;padding:6px 10px;background:#f8f8f8;border-bottom:1px solid #e5e5e5">Criteria</th>
          <th style="font-size:11px;font-weight:500;color:#888;text-align:center;padding:6px 10px;background:#f8f8f8;border-bottom:1px solid #e5e5e5;width:80px">Grade</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>${roundComment}</div>`;
  }).join("");

  const negotiationRows = [
    ["Candidate", report.name], ["Qualification", report.qualification],
    ["Current designation", report.designation], ["Expected salary", report.expectedSalary],
    ["Final salary offered", report.finalSalary],
    ["Date & Time", `${report.iDate || ""} ${report.iTime || ""}`],
    ["HR", `${report.hrName || "—"} (${report.hrDesignation || "—"})`],
    ["HOD", `${report.hodName || "—"} (${report.hodDepartment || "—"})`],
  ].map(([k, v]) => `<div style="display:flex;gap:12px;border-bottom:0.5px solid #f0f0f0;padding:6px 0">
    <span style="color:#888;min-width:160px;font-size:12px">${k}</span>
    <span style="color:#222;font-weight:${k === "Final salary offered" ? 600 : 400};font-size:13px">${v || "—"}</span>
  </div>`).join("");

  const hrBadge = report.hrName ? `<div style="background:#EEEDFE;border:0.5px solid #AFA9EC;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px;margin-bottom:10px">
    <div style="width:38px;height:38px;border-radius:50%;background:#534AB7;display:flex;align-items:center;justify-content:center;color:white;font-weight:500;font-size:14px;flex-shrink:0">${getInitials(report.hrName)}</div>
    <div><div style="font-weight:500;font-size:13px;color:#26215C">${report.hrName}</div>
    <div style="font-size:11px;color:#534AB7">${[report.hrDesignation, "HR Round 1"].filter(Boolean).join(" · ")}</div></div>
    <span style="margin-left:auto;font-size:10px;background:#E6F1FB;color:#185FA5;padding:2px 8px;border-radius:4px">HR</span></div>` : "";

  const hodBadge = report.hodName ? `<div style="background:#FAEEDA;border:0.5px solid #FAC775;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px">
    <div style="width:38px;height:38px;border-radius:50%;background:#854F0B;display:flex;align-items:center;justify-content:center;color:white;font-weight:500;font-size:14px;flex-shrink:0">${getInitials(report.hodName)}</div>
    <div><div style="font-weight:500;font-size:13px;color:#412402">${report.hodName}</div>
    <div style="font-size:11px;color:#854F0B">${[report.hodDesignation, report.hodDepartment].filter(Boolean).join(" · ")} — Round 2 & 3</div></div>
    <span style="margin-left:auto;font-size:10px;background:#FAEEDA;color:#854F0B;padding:2px 8px;border-radius:4px">HOD</span></div>` : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Interview Report — ${report.name}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f7;padding:24px;color:#222}.page{max-width:720px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:0.5px solid #e0e0e0}.card{background:white;border:0.5px solid #e5e5e5;border-radius:12px;padding:1.5rem;margin-bottom:1rem}.section-label{font-size:11px;font-weight:600;color:#534AB7;text-transform:uppercase;letter-spacing:.08em;margin-bottom:1rem;display:flex;align-items:center;gap:8px}.section-label::after{content:'';flex:1;height:0.5px;background:#e5e5e5}.no-print{margin-top:20px;text-align:center}@media print{body{background:white;padding:0}.page{border:none;border-radius:0}.no-print{display:none}}</style>
</head><body><div class="page">
<div style="background:linear-gradient(135deg,#534AB7,#7F77DD);padding:1.5rem 2rem;display:flex;align-items:center;justify-content:space-between">
  <div><div style="color:white;font-size:18px;font-weight:500;margin-bottom:2px">Candidate Interview Report</div>
  <div style="color:rgba(255,255,255,0.75);font-size:12px">HR (Round 1) · HOD (Round 2 & 3) · Multi-round panel</div></div>
  <div style="text-align:right"><div style="color:rgba(255,255,255,0.75);font-size:11px">Generated</div>
  <div style="color:white;font-size:12px;font-weight:500">${today()}</div></div>
</div>
<div style="padding:1.5rem">
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:1rem">
      <div><div style="font-size:20px;font-weight:500;color:#222">${report.name || "—"}</div>
      <div style="font-size:13px;color:#888;margin-top:2px">${report.designation || ""} → Applied: ${report.appliedRole || "—"} · ${report.jobRole || ""}</div>
      <div style="font-size:13px;color:#888;margin-top:2px">${report.iDate || ""} ${report.iTime || ""}</div></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${report.overallGrade ? `<span style="background:${gc.bg};color:${gc.color};padding:4px 14px;border-radius:100px;font-size:15px;font-weight:500">Overall: ${report.overallGrade}</span>` : ""}
        ${report.verdict ? `<span style="background:${vc.bg};color:${vc.color};padding:5px 14px;border-radius:100px;font-size:13px;font-weight:500">${report.verdict}</span>` : ""}
      </div>
    </div>
    ${hrBadge}${hodBadge}
  </div>
  <div class="card"><div class="section-label">Round-wise assessment</div>${roundRows}</div>
  <div class="card"><div class="section-label">HR Negotiation details</div><div style="font-size:14px;line-height:1.9">${negotiationRows}</div></div>
  ${report.hrComments ? `<div class="card"><div class="section-label">HR comments</div><div style="font-size:13px;color:#333;line-height:1.7">${report.hrComments}</div></div>` : ""}
  <div style="text-align:center;font-size:11px;color:#aaa;padding:8px 0 4px">Interview Assessment System · ${today()}</div>
</div></div>
<div class="no-print"><button onclick="window.print()" style="padding:11px 28px;background:#534AB7;color:white;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">🖨️ Print / Save as PDF</button></div>
</body></html>`;
}

// ─── ASSESSMENT FORM ──────────────────────────────────────────────────────────

function AssessmentForm({ onSubmit, userRole }) {
  const [candidate, setCandidate] = useState({ name: "", designation: "", appliedRole: "", jobRole: "", qualification: "", expectedSalary: "", finalSalary: "", iDate: "", iTime: "" });
  const [hod, setHod]           = useState({ name: "", designation: "", department: "" });
  const [hrPerson, setHrPerson] = useState({ name: "", designation: "", panel: "" });
  const [currentRound, setCurrentRound]   = useState(1);
  const [roundGrades, setRoundGrades]     = useState([{}, {}, {}]);
  const [roundComments, setRoundComments] = useState(["", "", ""]);
  const [verdict, setVerdict]     = useState("");
  const [hrComments, setHrComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [offerFile, setOfferFile] = useState(null);
  const [offerFileUrl, setOfferFileUrl] = useState(null);
  const [showPdf, setShowPdf]     = useState(false);
  const fileInputRef = useRef(null);

  const setC  = (k, v) => setCandidate(p => ({ ...p, [k]: v }));
  const setH  = (k, v) => setHod(p => ({ ...p, [k]: v }));
  const setHR = (k, v) => setHrPerson(p => ({ ...p, [k]: v }));

  const canSeeRound = (ri) => { if (userRole === "admin") return true; if (userRole === "hr") return ri === 0; return false; };
  const hodRoundIndices = userRole === "admin" ? [1, 2] : [];

  const handleGrade = (round, key, val) => {
    const g = val.toUpperCase().replace(/[^ABCDF]/g, "").slice(0, 1);
    setRoundGrades(prev => { const n = prev.map(r => ({ ...r })); n[round] = { ...n[round], [key]: g }; return n; });
  };

  const calcOverallGrade = () => {
    let total = 0, count = 0;
    roundGrades.forEach(rg => Object.values(rg).forEach(g => { if (g) { total += gradeToNum(g); count++; } }));
    return count > 0 ? numToGrade(total / count) : "";
  };

  const handleOfferFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files are accepted."); return; }
    setOfferFile(file); setOfferFileUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!candidate.name.trim()) { toast.error("Please enter candidate name."); return; }
    setLoading(true); setError("");
    const record = {
      ...candidate,
      hodName: hod.name, hodDesignation: hod.designation, hodDepartment: hod.department,
      hrName: hrPerson.name, hrDesignation: hrPerson.designation, hrPanel: hrPerson.panel,
      roundGrades: roundGrades.map(r => ({ ...r })),
      roundComments: [...roundComments],
      verdict, hrComments, overallGrade: calcOverallGrade(),
    };
    try {
      let offerLetterPath = null;
      if (offerFile) {
        const fd = new FormData();
        fd.append("offerLetter", offerFile); fd.append("candidateName", candidate.name);
        try { const up = await fetch(`${API_BASE}/upload-offer-letter`, { method: "POST", body: fd }); if (up.ok) { const ud = await up.json(); offerLetterPath = ud.filePath; } } catch {}
      }
      const res = await fetch(`${API_BASE}/assessments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...record, offerLetterPath }) });
      if (!res.ok) throw new Error("Server error");
      const saved = await res.json();
      onSubmit({ ...record, id: saved.id, offerLetterPath });
      setSubmitted(true);
      setCandidate({ name: "", designation: "", appliedRole: "", jobRole: "", qualification: "", expectedSalary: "", finalSalary: "", iDate: "", iTime: "" });
      setHod({ name: "", designation: "", department: "" }); setHrPerson({ name: "", designation: "", panel: "" });
      setRoundGrades([{}, {}, {}]); setRoundComments(["", "", ""]);
      setVerdict(""); setHrComments(""); setOfferFile(null); setOfferFileUrl(null);
      setTimeout(() => setSubmitted(false), 4000);
    } catch { setError("Failed to save. Check backend connection."); }
    finally { setLoading(false); }
  };

  const GradeTable = ({ roundIdx }) => (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr>
        <th style={{ ...thStyle, width: 36 }}>#</th>
        <th style={thStyle}>Assessment criteria</th>
        <th style={{ ...thStyle, width: 150 }}>Grade (A/B/C/D/F)</th>
        <th style={{ ...thStyle, width: 70, textAlign: "center" }}>Badge</th>
      </tr></thead>
      <tbody>
        {roundDefs[roundIdx].criteria.map((c, i) => {
          const g = roundGrades[roundIdx][c.key] || "";
          return (
            <tr key={c.key}>
              <td style={{ ...tdStyle, color: "#aaa", fontSize: 13 }}>{i + 1}</td>
              <td style={tdStyle}>{c.name}</td>
              <td style={tdStyle}><input style={{ ...inputStyle, padding: "7px 10px", fontSize: 13, textTransform: "uppercase" }} maxLength={1} placeholder="A/B/C/D/F" value={g} onChange={e => handleGrade(roundIdx, c.key, e.target.value)} /></td>
              <td style={{ ...tdStyle, textAlign: "center" }}><Badge grade={g} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <>
      {showPdf && offerFileUrl && <PdfViewerModal pdfUrl={offerFileUrl} fileName={offerFile?.name || "offer-letter.pdf"} onClose={() => setShowPdf(false)} />}
      <Card>
        <SectionLabel>👤 Candidate information</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Full name"><input style={inputStyle} value={candidate.name} onChange={e => setC("name", e.target.value)} placeholder="e.g. Rahul Sharma" /></Field>
          <Field label="Current designation"><input style={inputStyle} value={candidate.designation} onChange={e => setC("designation", e.target.value)} placeholder="e.g. Software Engineer" /></Field>
          <Field label="Applied for"><input style={inputStyle} value={candidate.appliedRole} onChange={e => setC("appliedRole", e.target.value)} placeholder="Role applied for" /></Field>
          <Field label="Job role / department"><input style={inputStyle} value={candidate.jobRole} onChange={e => setC("jobRole", e.target.value)} placeholder="e.g. Backend, Sales" /></Field>
          <Field label="Qualification"><input style={inputStyle} value={candidate.qualification} onChange={e => setC("qualification", e.target.value)} placeholder="e.g. B.Tech / MBA" /></Field>
          <Field label="Expected salary"><input style={inputStyle} value={candidate.expectedSalary} onChange={e => setC("expectedSalary", e.target.value)} placeholder="e.g. 5 LPA" /></Field>
          <Field label="Interview date"><input style={inputStyle} type="date" value={candidate.iDate} onChange={e => setC("iDate", e.target.value)} /></Field>
          <Field label="Interview time"><input style={inputStyle} type="time" value={candidate.iTime} onChange={e => setC("iTime", e.target.value)} /></Field>
        </div>
      </Card>
      <Card style={{ border: "0.5px solid #AFA9EC" }}>
        <SectionLabel>🧑‍💼 HR Interviewer — Round 1</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="HR Name"><input style={inputStyle} value={hrPerson.name} onChange={e => setHR("name", e.target.value)} placeholder="e.g. Priya Mehta" /></Field>
          <Field label="HR Designation"><input style={inputStyle} value={hrPerson.designation} onChange={e => setHR("designation", e.target.value)} placeholder="e.g. HR Manager" /></Field>
          <Field label="Interview Panel / Team"><input style={inputStyle} value={hrPerson.panel} onChange={e => setHR("panel", e.target.value)} placeholder="e.g. HR Panel A" /></Field>
        </div>
      </Card>
      <Card style={{ border: "0.5px solid #FAC775" }}>
        <SectionLabel>🏢 Department Head (HOD) — Round 2 &amp; 3</SectionLabel>
        <div style={{ background: "#FAEEDA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#854F0B", marginBottom: 12 }}>
          ℹ️ The Department Head conducts Technical (Round 2) and Final (Round 3) interviews.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="HOD Name"><input style={inputStyle} value={hod.name} onChange={e => setH("name", e.target.value)} placeholder="e.g. Amit Verma" /></Field>
          <Field label="HOD Designation"><input style={inputStyle} value={hod.designation} onChange={e => setH("designation", e.target.value)} placeholder="e.g. Senior Manager" /></Field>
          <Field label="HOD Department"><input style={inputStyle} value={hod.department} onChange={e => setH("department", e.target.value)} placeholder="e.g. Engineering, Sales, Finance" /></Field>
        </div>
      </Card>
      {canSeeRound(0) && (
        <Card style={{ border: "0.5px solid #AFA9EC" }}>
          <SectionLabel>
            <span style={{ color: "#185FA5" }}>🧑‍💼 HR Round — Round 1</span>
            <span style={{ fontSize: 10, background: "#E6F1FB", color: "#185FA5", borderRadius: 4, padding: "2px 7px", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>Conducted by HR</span>
          </SectionLabel>
          <GradeTable roundIdx={0} />
          <div style={{ marginTop: 12 }}>
            <Field label="HR Round comments">
              <textarea rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} placeholder="HR Round observations..." value={roundComments[0]}
                onChange={e => { const v = e.target.value; setRoundComments(p => { const n = [...p]; n[0] = v; return n; }); }} />
            </Field>
          </div>
        </Card>
      )}
      {hodRoundIndices.length > 0 && (
        <Card style={{ border: "0.5px solid #FAC775" }}>
          <SectionLabel>
            <span style={{ color: "#854F0B" }}>🏢 HOD Interview Rounds</span>
            <span style={{ fontSize: 10, background: "#FAEEDA", color: "#854F0B", borderRadius: 4, padding: "2px 7px", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>Conducted by Department Head</span>
          </SectionLabel>
          {hod.name && (
            <div style={{ background: "#FAEEDA", border: "0.5px solid #FAC775", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#854F0B", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{getInitials(hod.name)}</div>
              <div><div style={{ fontWeight: 500, fontSize: 13, color: "#412402" }}>{hod.name}</div><div style={{ fontSize: 11, color: "#854F0B" }}>{hod.designation} · {hod.department}</div></div>
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}>
            {hodRoundIndices.map(i => (
              <button key={i} onClick={() => setCurrentRound(i)} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "0.5px solid", fontFamily: "inherit", borderColor: currentRound === i ? "#854F0B" : "#e0e0e0", background: currentRound === i ? "#854F0B" : "#f8f8f8", color: currentRound === i ? "white" : "#666" }}>Round {i + 1}</button>
            ))}
          </div>
          <div style={{ fontWeight: 500, fontSize: 14, color: "#854F0B", marginBottom: 10 }}>{roundDefs[currentRound].label}</div>
          <GradeTable roundIdx={currentRound} />
          <div style={{ marginTop: 12 }}>
            <Field label={`Round ${currentRound + 1} comments`}>
              <textarea rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} placeholder={`HOD observations for Round ${currentRound + 1}...`} value={roundComments[currentRound]}
                onChange={e => { const v = e.target.value; setRoundComments(p => { const n = [...p]; n[currentRound] = v; return n; }); }} />
            </Field>
          </div>
        </Card>
      )}
      <Card>
        <SectionLabel>💰 HR Negotiation</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Final salary offered"><input style={inputStyle} value={candidate.finalSalary} onChange={e => setC("finalSalary", e.target.value)} placeholder="e.g. 4.5 LPA" /></Field>
          <Field label="Final status">
            <select style={{ ...inputStyle, cursor: "pointer" }} value={verdict} onChange={e => setVerdict(e.target.value)}>
              <option value="">Select status</option><option>Selected</option><option>Rejected</option><option value="On Hold">On Hold</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="HR comments">
            <textarea rows={3} style={inputStyle} value={hrComments} onChange={e => setHrComments(e.target.value)} placeholder="Negotiation remarks, salary justification..." />
          </Field>
        </div>
        {verdict === "Selected" && (
          <div style={{ marginTop: 16, background: "#EAF3DE", border: "0.5px solid #97C459", borderRadius: 10, padding: "1rem 1.2rem" }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: "#3B6D11", marginBottom: 8 }}>📎 Upload Offer Letter (PDF)</div>
            <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={handleOfferFileChange} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: "8px 16px", background: "white", border: "1px solid #3B6D11", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#3B6D11", cursor: "pointer", fontFamily: "inherit" }}>{offerFile ? "📄 Change File" : "📤 Choose PDF"}</button>
              {offerFile && (<>
                <span style={{ fontSize: 12, color: "#3B6D11", fontWeight: 500 }}>✅ {offerFile.name}</span>
                <button onClick={() => setShowPdf(true)} style={{ padding: "8px 16px", background: "#3B6D11", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>👁 View PDF</button>
                <button onClick={() => { setOfferFile(null); setOfferFileUrl(null); }} style={{ padding: "8px 12px", background: "#FCEBEB", color: "#A32D2D", border: "0.5px solid #F09595", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✕ Remove</button>
              </>)}
            </div>
            {!offerFile && <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Only PDF files accepted · Max 10 MB</div>}
          </div>
        )}
      </Card>
      {error && <div style={{ background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: 8, padding: "12px 16px", color: "#A32D2D", fontSize: 14, marginBottom: 12 }}>{error}</div>}
      <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: 13, background: loading ? "#9990d6" : "#534AB7", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
        {loading ? "Saving..." : "Submit assessment"}
      </button>
      {submitted && <div style={{ background: "#EAF3DE", border: "0.5px solid #97C459", borderRadius: 8, padding: "12px 16px", color: "#3B6D11", fontSize: 14, marginTop: "1rem", textAlign: "center" }}>✅ Assessment submitted successfully!</div>}
    </>
  );
}

// ─── REPORTS LIST ─────────────────────────────────────────────────────────────

function ReportsList({ reports, onSelect }) {
  const [filterVerdict, setFilterVerdict] = useState("");
  const filtered = filterVerdict ? reports.filter(r => r.verdict === filterVerdict) : reports;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["", "Selected", "On Hold", "Rejected"].map(v => (
            <button key={v} onClick={() => setFilterVerdict(v)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "inherit", border: "0.5px solid", fontWeight: 500, borderColor: filterVerdict === v ? "#534AB7" : "#e0e0e0", background: filterVerdict === v ? "#534AB7" : "white", color: filterVerdict === v ? "white" : "#666" }}>{v || "All"}</button>
          ))}
        </div>
        <button onClick={() => window.open(`${API_BASE}/assessments/export/pdf`, "_blank")} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: "#A32D2D", color: "white", border: "none" }}>📄 Download All PDF</button>
      </div>
      {filtered.length === 0
        ? <div style={{ textAlign: "center", color: "#888", padding: "2rem", fontSize: 14 }}>No reports yet.</div>
        : filtered.map((r, i) => {
          const vc = verdictColors[r.verdict] || { bg: "#f0f0f0", color: "#888" };
          return (
            <div key={r.id || i} onClick={() => onSelect(reports.indexOf(r))}
              style={{ background: "white", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: "1.2rem 1.5rem", marginBottom: "0.75rem", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#534AB7"; e.currentTarget.style.background = "#EEEDFE"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e5e5"; e.currentTarget.style.background = "white"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 15, color: "#222" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{r.appliedRole || "—"} · {r.qualification || "—"} · Offered: {r.finalSalary || "—"}</div>
                  {r.hrName && <div style={{ fontSize: 12, color: "#534AB7", marginTop: 2 }}>HR: {r.hrName}</div>}
                  {r.hodName && <div style={{ fontSize: 12, color: "#854F0B", marginTop: 2 }}>HOD: {r.hodName} ({r.hodDepartment})</div>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {r.overallGrade && <Badge grade={r.overallGrade} />}
                  {r.verdict && <span style={{ background: vc.bg, color: vc.color, padding: "3px 12px", borderRadius: 100, fontSize: 12, fontWeight: 500 }}>{r.verdict}</span>}
                  {r.offerLetterPath && <span style={{ background: "#EAF3DE", color: "#3B6D11", padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 500 }}>📎 Offer</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {roundDefs.map((rd, ri) => {
                  const filled = Object.values(r.roundGrades?.[ri] || {}).filter(g => g).length;
                  return <span key={ri} style={{ background: "#f0f0f0", color: "#666", padding: "2px 10px", borderRadius: 100, fontSize: 11 }}>R{ri + 1}: {filled}/{rd.criteria.length} graded</span>;
                })}
              </div>
            </div>
          );
        })}
    </>
  );
}

// ─── REPORT DETAIL ────────────────────────────────────────────────────────────

function ReportDetail({ report, onBack, userRole = "admin" }) {
  const [approvalStatus, setApprovalStatus] = useState(report.verdict || "");
  const [saving, setSaving]   = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  const vc = verdictColors[approvalStatus] || { bg: "#f0f0f0", color: "#888" };
  const gc = gradeColors[report.overallGrade] || { bg: "#f0f0f0", color: "#888" };
  const canSeeRound = (ri) => { if (userRole === "admin") return true; if (userRole === "hr") return ri === 0; return false; };

  const handleApproval = async (status) => {
    setSaving(true);
    try { await fetch(`${API_BASE}/assessments/${report.id}/verdict`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verdict: status }) }); setApprovalStatus(status); } catch {}
    setSaving(false);
  };

  const offerPdfUrl = report.offerLetterPath ? `${API_BASE.replace("/api", "")}/uploads/${report.offerLetterPath}` : null;

  const handlePrint = () => {
    const w = window.open("", "_blank");
    w.document.write(buildPrintHTML({ ...report, verdict: approvalStatus }));
    w.document.close(); w.onload = () => w.print();
  };

  return (
    <>
      {showPdf && offerPdfUrl && <PdfViewerModal pdfUrl={offerPdfUrl} fileName={`offer-${report.name}.pdf`} onClose={() => setShowPdf(false)} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#534AB7", fontSize: 14, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>← Back to reports</button>
        <button onClick={handlePrint} style={{ padding: "8px 18px", background: "#534AB7", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>🖨️ Print / Save PDF</button>
      </div>
      <div style={{ background: "white", border: "0.5px solid #e0e0e0", borderRadius: 12, overflow: "hidden", marginBottom: "1rem" }}>
        <div style={{ background: "linear-gradient(135deg,#534AB7,#7F77DD)", padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "white", fontSize: 18, fontWeight: 500, marginBottom: 2 }}>Candidate Interview Report</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>HR (Round 1) · HOD (Round 2 &amp; 3) · Multi-round panel</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>Generated</div>
            <div style={{ color: "white", fontSize: 12, fontWeight: 500 }}>{today()}</div>
          </div>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: "1rem" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 500, color: "#222" }}>{report.name}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{report.designation || ""} → Applied: {report.appliedRole || "—"} · {report.jobRole || ""}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{report.iDate || ""} {report.iTime || ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {report.overallGrade && <span style={{ background: gc.bg, color: gc.color, padding: "4px 14px", borderRadius: 100, fontSize: 15, fontWeight: 500 }}>Overall: {report.overallGrade}</span>}
                {approvalStatus && <span style={{ background: vc.bg, color: vc.color, padding: "5px 14px", borderRadius: 100, fontSize: 13, fontWeight: 500 }}>{approvalStatus}</span>}
              </div>
            </div>
            {report.hrName && (
              <div style={{ background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#534AB7", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 500, fontSize: 14, flexShrink: 0 }}>{getInitials(report.hrName)}</div>
                <div><div style={{ fontWeight: 500, fontSize: 13, color: "#26215C" }}>{report.hrName}</div><div style={{ fontSize: 11, color: "#534AB7" }}>{[report.hrDesignation, "HR Round 1"].filter(Boolean).join(" · ")}</div></div>
                <span style={{ marginLeft: "auto", fontSize: 10, background: "#E6F1FB", color: "#185FA5", padding: "2px 8px", borderRadius: 4 }}>HR</span>
              </div>
            )}
            {report.hodName && (
              <div style={{ background: "#FAEEDA", border: "0.5px solid #FAC775", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#854F0B", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 500, fontSize: 14, flexShrink: 0 }}>{getInitials(report.hodName)}</div>
                <div><div style={{ fontWeight: 500, fontSize: 13, color: "#412402" }}>{report.hodName}</div><div style={{ fontSize: 11, color: "#854F0B" }}>{[report.hodDesignation, report.hodDepartment].filter(Boolean).join(" · ")} — Round 2 &amp; 3</div></div>
                <span style={{ marginLeft: "auto", fontSize: 10, background: "#FAEEDA", color: "#854F0B", padding: "2px 8px", borderRadius: 4 }}>HOD</span>
              </div>
            )}
          </Card>
          <Card>
            <SectionLabel>Round-wise assessment</SectionLabel>
            {roundDefs.map((rd, ri) => {
              if (!canSeeRound(ri)) return null;
              const isHr = ri === 0;
              return (
                <div key={ri} style={{ marginBottom: "1.2rem" }}>
                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, color: isHr ? "#185FA5" : "#854F0B", display: "flex", alignItems: "center", gap: 8 }}>
                    {rd.label}
                    <span style={{ fontSize: 10, background: isHr ? "#E6F1FB" : "#FAEEDA", color: isHr ? "#185FA5" : "#854F0B", borderRadius: 4, padding: "2px 7px", fontWeight: 500 }}>{isHr ? "HR Only" : "HOD"}</span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={{ ...thStyle, width: 36 }}>#</th><th style={thStyle}>Criteria</th><th style={{ ...thStyle, width: 80, textAlign: "center" }}>Grade</th></tr></thead>
                    <tbody>
                      {rd.criteria.map((c, ci) => (
                        <tr key={c.key}>
                          <td style={{ ...tdStyle, color: "#aaa", fontSize: 13 }}>{ci + 1}</td>
                          <td style={tdStyle}>{c.name}</td>
                          <td style={{ ...tdStyle, textAlign: "center" }}><Badge grade={report.roundGrades?.[ri]?.[c.key] || ""} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {report.roundComments?.[ri] && (
                    <div style={{ background: "#f8f8f8", borderRadius: 8, padding: "10px 12px", marginTop: 8, fontSize: 13, color: "#444", lineHeight: 1.6 }}>
                      <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Round {ri + 1} comments</span>
                      {report.roundComments[ri]}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
          <Card>
            <SectionLabel>HR Negotiation details</SectionLabel>
            <div style={{ fontSize: 14, lineHeight: 1.9 }}>
              {[
                ["Candidate", report.name], ["Qualification", report.qualification],
                ["Current designation", report.designation], ["Expected salary", report.expectedSalary],
                ["Final salary offered", report.finalSalary],
                ["Date & Time", `${report.iDate || ""} ${report.iTime || ""}`],
                ["HR", `${report.hrName || "—"} (${report.hrDesignation || "—"})`],
                ["HOD", `${report.hodName || "—"} (${report.hodDepartment || "—"})`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 12, borderBottom: "0.5px solid #f0f0f0", padding: "6px 0" }}>
                  <span style={{ color: "#888", minWidth: 160, fontSize: 13 }}>{k}</span>
                  <span style={{ color: "#222", fontWeight: k === "Final salary offered" ? 600 : 400 }}>{v || "—"}</span>
                </div>
              ))}
            </div>
          </Card>
          {report.hrComments && <Card><SectionLabel>HR comments</SectionLabel><div style={{ fontSize: 14, color: "#333", lineHeight: 1.7 }}>{report.hrComments}</div></Card>}
        </div>
      </div>
      <Card>
        <SectionLabel>Approval &amp; Final decision</SectionLabel>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {[
            { label: "Approve / Select", value: "Selected", bg: "#EAF3DE", color: "#3B6D11", hoverBg: "#639922" },
            { label: "Reject",           value: "Rejected", bg: "#FCEBEB", color: "#A32D2D", hoverBg: "#E24B4A" },
            { label: "Hold",             value: "On Hold",  bg: "#FAEEDA", color: "#854F0B", hoverBg: "#EF9F27" },
          ].map(btn => (
            <button key={btn.value} onClick={() => handleApproval(btn.value)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", border: "0.5px solid", borderColor: approvalStatus === btn.value ? btn.hoverBg : btn.color, background: approvalStatus === btn.value ? btn.hoverBg : btn.bg, color: approvalStatus === btn.value ? "white" : btn.color }}>{btn.label}</button>
          ))}
        </div>
        {approvalStatus && <div style={{ fontSize: 13, color: "#666" }}>Current status: <strong style={{ color: verdictColors[approvalStatus]?.color || "#222" }}>{approvalStatus}</strong></div>}
      </Card>
      {(approvalStatus === "Selected" || report.offerLetterPath) && (
        <Card style={{ border: `0.5px solid ${report.offerLetterPath ? "#97C459" : "#e0e0e0"}`, background: report.offerLetterPath ? "#EAF3DE" : "white" }}>
          <SectionLabel>📎 Offer Letter</SectionLabel>
          {report.offerLetterPath ? (
            <div>
              <div style={{ fontSize: 14, color: "#3B6D11", marginBottom: 12 }}>Offer letter uploaded for <strong>{report.name}</strong>.</div>
              <button onClick={() => setShowPdf(true)} style={{ padding: "10px 20px", background: "#3B6D11", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>👁 View Offer Letter PDF</button>
            </div>
          ) : <div style={{ fontSize: 14, color: "#888" }}>No offer letter uploaded yet.</div>}
        </Card>
      )}
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function InterviewApp() {
  const [currentUser, setCurrentUser]       = useState(null);
  const [activeTab, setActiveTab]           = useState("form");
  const [reports, setReports]               = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading]               = useState(false);

  // ── NEW: controls whether Onboarding page is showing ──────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setLoading(true);
    fetch(`${API_BASE}/assessments`)
      .then(r => r.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("form");
    setSelectedReport(null);
    setReports([]);
    setShowOnboarding(false);
  };

  const handleSubmit = record => setReports(prev => [record, ...prev]);

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  // ── If Onboarding button was clicked, render OnboardingForm full-page ──────
  if (showOnboarding) {
    return (
      <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        {/* Slim top bar so user can go back */}
        <div style={{
          background: "linear-gradient(135deg,#534AB7,#7F77DD)",
          padding: "10px 20px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <button
            onClick={() => setShowOnboarding(false)}
            style={{
              padding: "7px 16px", background: "rgba(255,255,255,0.15)",
              color: "white", border: "0.5px solid rgba(255,255,255,0.3)",
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            ← Back to Dashboard
          </button>
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 500 }}>
            🏢 HR Onboarding
          </span>
        </div>
        <OnboardingForm onSubmit={() => {}} />
      </div>
    );
  }

  const roleColor = currentUser.role === "admin" ? "#534AB7" : "#185FA5";
  const roleBg    = currentUser.role === "admin" ? "#EEEDFE"  : "#E6F1FB";

  const tabs = [
    { key: "form",    label: "Assessment Form" },
    { key: "reports", label: `Interview Reports${reports.length > 0 ? ` (${reports.length})` : ""}` },
    ...(currentUser.role === "admin" ? [{ key: "users", label: "👥 Users" }] : []),
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg,#534AB7,#7F77DD)", borderRadius: 12,
        padding: "1.25rem 1.5rem", marginBottom: "1.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "1rem", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div style={{ color: "white", fontSize: 17, fontWeight: 500, marginBottom: 2 }}>Candidate Interview Assessment</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>HR (Round 1) · HOD (Round 2 &amp; 3) · Multi-round panel</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "white", fontSize: 13, fontWeight: 500 }}>{currentUser.name}</div>
            <span style={{ background: roleBg, color: roleColor, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4 }}>{currentUser.label}</span>
          </div>
          <button onClick={handleLogout} style={{
            padding: "7px 14px", background: "rgba(255,255,255,0.15)",
            color: "white", border: "0.5px solid rgba(255,255,255,0.3)",
            borderRadius: 8, fontSize: 12, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}>Sign out</button>
        </div>
      </div>

      {/* ── Tabs + Onboarding button ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedReport(null); }} style={{
            padding: "9px 20px", borderRadius: 8, fontSize: 14, cursor: "pointer",
            fontWeight: 500, fontFamily: "inherit", border: "0.5px solid",
            borderColor: activeTab === t.key ? "#534AB7" : "#e0e0e0",
            background: activeTab === t.key ? "#534AB7" : "white",
            color: activeTab === t.key ? "white" : "#666",
          }}>{t.label}</button>
        ))}

        {/* ── Onboarding Button ── */}
        <button
          onClick={() => setShowOnboarding(true)}
          style={{
            marginLeft: "auto",
            padding: "9px 20px", borderRadius: 8, fontSize: 14, cursor: "pointer",
            fontWeight: 500, fontFamily: "inherit",
            border: "0.5px solid #0F6E56",
            background: "#E1F5EE", color: "#0F6E56",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          🏢 Onboarding
        </button>
      </div>

      {loading && <div style={{ textAlign: "center", color: "#888", padding: "2rem", fontSize: 14 }}>Loading...</div>}

      {!loading && activeTab === "form" && <AssessmentForm onSubmit={handleSubmit} userRole={currentUser.role} />}
      {!loading && activeTab === "reports" && (
        selectedReport !== null
          ? <ReportDetail report={reports[selectedReport]} onBack={() => setSelectedReport(null)} userRole={currentUser.role} />
          : <ReportsList reports={reports} onSelect={setSelectedReport} />
      )}
      {!loading && activeTab === "users" && currentUser.role === "admin" && <UserManagement />}
    </div>
  );
}