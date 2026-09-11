import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ROLES = [
  {
    key: "admin",
    label: "Admin",
    icon: "🛡️",
    color: "#7c3aed",
    light: "#ede9fe",
    border: "#a78bfa",
    desc: "Full system access",
  },
  {
    key: "hrmanager",
    label: "HR Manager",
    icon: "👩‍💼",
    color: "#0ea5e9",
    light: "#e0f2fe",
    border: "#7dd3fc",
    desc: "Manage employees & payroll",
  },
  {
    key: "manager",
    label: "Reporting Manager",
    icon: "📋",
    color: "#059669",
    light: "#d1fae5",
    border: "#6ee7b7",
    desc: "View team & reports",
  },
];

const API = "http://localhost:5001";

const ManageEmployee = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const activeRole = ROLES.find((r) => r.key === selectedRole);

  const handleLogin = async () => {
    if (!selectedRole) return setError("Please select a role first.");
    if (!email || !password) return setError("Enter email and password.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: selectedRole }),
      });

      const data = await res.json();

      if (data) {
        localStorage.setItem("role", selectedRole);
        localStorage.setItem("user", JSON.stringify(data.user || {}));

        // ── Employee status tracking ──
        localStorage.setItem("employee", JSON.stringify(data.user || {}));
        localStorage.setItem("status", data.user?.status || "Active");
        localStorage.setItem("employee_code", data.user?.employee_code || "");

        navigate("/login");
      } else {
        setError(data.error || "Invalid credentials.");
      }
    } catch (e) {
      setError("Server error: " + e.message);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div style={styles.page}>
      {/* Background blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoRing}>
            <span style={{ fontSize: 28 }}>🏢</span>
          </div>
          <h1 style={styles.title}>HR Portal</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.divLine} />
          <span style={styles.divText}>credentials</span>
          <div style={styles.divLine} />
        </div>

        {/* Email */}
        <div style={styles.fieldWrap}>
          <label style={styles.label}>Email Address</label>
          <div style={styles.inputWrap}>
            <span style={styles.inputIcon}>✉️</span>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKey}
              style={{
                ...styles.input,
                borderColor: activeRole ? activeRole.border : "#d1d5db",
              }}
            />
          </div>
        </div>

        {/* Password */}
        <div style={styles.fieldWrap}>
          <label style={styles.label}>Password</label>
          <div style={styles.inputWrap}>
            <span style={styles.inputIcon}>🔒</span>
            <input
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKey}
              style={{
                ...styles.input,
                borderColor: activeRole ? activeRole.border : "#d1d5db",
                paddingRight: 40,
              }}
            />
            <button
              onClick={() => setShowPass((v) => !v)}
              style={styles.eyeBtn}
              tabIndex={-1}
            >
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span style={{ marginRight: 6 }}>⚠️</span>
            {error}
          </div>
        )}

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            ...styles.loginBtn,
            background: activeRole
              ? `linear-gradient(135deg, ${activeRole.color}, ${activeRole.color}cc)`
              : "linear-gradient(135deg, #6b7280, #9ca3af)",
            opacity: loading ? 0.75 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <span style={styles.spinner} />
          ) : (
            <>
              {activeRole ? activeRole.icon : "🔑"}&nbsp;
              {loading
                ? "Signing in..."
                : `Sign in as ${activeRole ? activeRole.label : "..."}`}
            </>
          )}
        </button>

        <p style={styles.footer}>
          © {new Date().getFullYear()} HR Management System
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
        input:focus { outline: none; }
        button:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  blob1: {
    position: "fixed",
    top: -120,
    right: -120,
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(circle, #c4b5fd44, transparent 70%)",
    pointerEvents: "none",
  },
  blob2: {
    position: "fixed",
    bottom: -100,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: "50%",
    background: "radial-gradient(circle, #7dd3fc44, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    background: "#ffffff",
    borderRadius: 24,
    padding: "36px 32px 28px",
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)",
    animation: "floatIn 0.5s ease both",
    position: "relative",
    zIndex: 1,
  },
  header: {
    textAlign: "center",
    marginBottom: 28,
  },
  logoRing: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ede9fe, #e0f2fe)",
    border: "2px solid #a78bfa",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1.2px",
    color: "#9ca3af",
    marginBottom: 10,
  },
  roleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginBottom: 24,
  },
  roleBtn: {
    border: "2px solid #e5e7eb",
    borderRadius: 14,
    padding: "12px 8px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "all 0.2s ease",
    background: "#fafafa",
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: 600,
    textAlign: "center",
    marginBottom: 2,
  },
  roleDesc: {
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 1.3,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  divLine: {
    flex: 1,
    height: 1,
    background: "#e5e7eb",
  },
  divText: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: 500,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  fieldWrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    display: "block",
    marginBottom: 6,
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    fontSize: 15,
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "11px 12px 11px 38px",
    fontSize: 14,
    border: "2px solid #d1d5db",
    borderRadius: 12,
    transition: "border-color 0.2s",
    color: "#111827",
    background: "#fafafa",
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    padding: "4px",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#dc2626",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
  },
  loginBtn: {
    width: "100%",
    padding: "13px",
    borderRadius: 14,
    border: "none",
    color: "white",
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.3px",
    marginTop: 4,
    marginBottom: 20,
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  spinner: {
    width: 18,
    height: 18,
    border: "3px solid rgba(255,255,255,0.3)",
    borderTop: "3px solid white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#9ca3af",
  },
};

export default ManageEmployee;
