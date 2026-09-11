import { useCallback, useEffect, useState } from "react";

// ─── Config ───────────────────────────────────────────────
const API_BASE = "http://localhost:5007/api/resignations";

// ─── Role Credentials ─────────────────────────────────────
const ROLE_CREDENTIALS = {
  employee: {
    password: "emp123",
    label: "Employee",
    color: "#6366F1",
    bg: "#EEF2FF",
    icon: "👤",
  },
  rm: {
    password: "rm123",
    label: "Immediate Boss (RM)",
    color: "#0891B2",
    bg: "#ECFEFF",
    icon: "👔",
  },
  hod: {
    password: "hod123",
    label: "Department Head (HOD)",
    color: "#059669",
    bg: "#ECFDF5",
    icon: "🏢",
  },
  hr: {
    password: "hr123",
    label: "HR Head",
    color: "#BE185D",
    bg: "#FFF0F6",
    icon: "🧑‍💼",
  },
  admin: {
    password: "admin123",
    label: "Admin",
    color: "#185FA5",
    bg: "#E6F1FB",
    icon: "🖥️",
  },
  finance: {
    password: "finance123",
    label: "Finance",
    color: "#4F46E5",
    bg: "#F1F5FF",
    icon: "💰",
  },
};

// ─── Safe JSON Fetch Helper ────────────────────────────────
async function safeFetch(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (
      err.message.includes("Failed to fetch") ||
      err.message.includes("NetworkError") ||
      err.message.includes("fetch")
    ) {
      throw new Error("NETWORK_ERROR");
    }
    throw err;
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error(`SERVER_ERROR:${res.status}`);
    throw new Error("INVALID_JSON");
  }

  if (!res.ok) throw new Error(data.message || `SERVER_ERROR:${res.status}`);
  return data;
}

function getErrorMessage(err) {
  const msg = err.message || "";
  if (msg === "NETWORK_ERROR")
    return "⚠ Backend server not reachable. Please make sure your Express server is running on localhost:5020.";
  if (msg === "INVALID_JSON")
    return "⚠ Server returned an invalid response. Check if your API route is correctly configured.";
  if (msg.startsWith("SERVER_ERROR:404"))
    return "⚠ Record not found. Please check the reference number and try again.";
  if (msg.startsWith("SERVER_ERROR:"))
    return `⚠ Server error (${msg.split(":")[1]}). Please check your backend logs.`;
  return "⚠ " + msg;
}

function parseDecisionFromRow(row) {
  if (!row) return { decision: null, comment: "" };
  const note = (row.note || "").toString();
  const match = note.match(/^(ACCEPT|REJECT):\s*(.*)$/i);
  if (match)
    return { decision: match[1].toLowerCase(), comment: match[2].trim() };
  return { decision: row.is_checked ? "accept" : null, comment: note.trim() };
}

// ─── Helpers ─────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${parseInt(day)} ${months[+m - 1]}, ${y}`;
}

function calcTenure(d1, d2) {
  if (!d1 || !d2) return "N/A";
  const a = new Date(d1),
    b = new Date(d2);
  let y = b.getFullYear() - a.getFullYear();
  let mo = b.getMonth() - a.getMonth();
  if (mo < 0) {
    y--;
    mo += 12;
  }
  const parts = [];
  if (y > 0) parts.push(`${y} ${y === 1 ? "yr" : "yrs"}`);
  if (mo > 0) parts.push(`${mo} ${mo === 1 ? "mo" : "mos"}`);
  return parts.join(" ") || "< 1 month";
}

// ─── Notification Sound ───────────────────────────────────
function playNotificationSound() {
  try {
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5,
    );
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (err) {
    console.log("Notification sound failed:", err);
  }
}

function Divider() {
  return (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid #F0EDE8",
        margin: "0.75rem 0",
      }}
    />
  );
}

function CheckboxItem({ checked, label, sub, onChange, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onChange}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 10,
        marginBottom: 6,
        border: `1.5px solid ${checked ? "#6EE7B7" : "#EBEBEB"}`,
        background: checked ? "#ECFDF5" : disabled ? "#F5F5F5" : "#FAFAF9",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .15s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={disabled ? undefined : onChange}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
        style={{ marginTop: 2, accentColor: "#059669", flexShrink: 0 }}
      />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: "#9A9693", marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      {checked && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 100,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            background: "#ECFDF5",
            color: "#059669",
            border: "1px solid #6EE7B7",
            flexShrink: 0,
          }}
        >
          ✓ Done
        </span>
      )}
    </div>
  );
}

function ApprovalButtons({
  label,
  value,
  comment,
  onDecision,
  onComment,
  disabled,
}) {
  return (
    <div
      style={{
        background: disabled ? "#F5F5F5" : "#FAFAF9",
        border: "1px solid #EBEBEB",
        borderRadius: 12,
        padding: "12px 14px",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: "#9A9693",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: value ? 8 : 0 }}>
        <button
          onClick={() => !disabled && onDecision("accept")}
          disabled={disabled}
          style={{
            padding: "7px 18px",
            borderRadius: 8,
            border: `1.5px solid ${value === "accept" ? "#6EE7B7" : "#E8E5E0"}`,
            background: value === "accept" ? "#ECFDF5" : "#fff",
            color: value === "accept" ? "#059669" : "#555",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 600,
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "all .15s",
          }}
        >
          ✓ Accept
        </button>
        <button
          onClick={() => !disabled && onDecision("reject")}
          disabled={disabled}
          style={{
            padding: "7px 18px",
            borderRadius: 8,
            border: `1.5px solid ${value === "reject" ? "#FCA5A5" : "#E8E5E0"}`,
            background: value === "reject" ? "#FFF1F2" : "#fff",
            color: value === "reject" ? "#DC2626" : "#555",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 600,
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "all .15s",
          }}
        >
          ✕ Reject
        </button>
        {value && (
          <span
            style={{
              alignSelf: "center",
              marginLeft: 4,
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 100,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              background: value === "accept" ? "#ECFDF5" : "#FFF1F2",
              color: value === "accept" ? "#059669" : "#DC2626",
              border: `1px solid ${value === "accept" ? "#6EE7B7" : "#FCA5A5"}`,
            }}
          >
            {value === "accept" ? "✓ Accepted" : "✕ Rejected"}
          </span>
        )}
      </div>
      {value && (
        <textarea
          placeholder={`${label} comment (required)...`}
          value={comment || ""}
          onChange={(e) => !disabled && onComment(e.target.value)}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1.5px solid #E8E5E0",
            background: disabled ? "#F5F5F5" : "#fff",
            fontFamily: "inherit",
            fontSize: 12,
            color: "#1A1A1A",
            resize: "vertical",
            minHeight: 58,
            outline: "none",
            marginTop: 8,
          }}
        />
      )}
    </div>
  );
}

function RadioItem({ name, id, label, sub, selected, onChange, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onChange}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 10,
        marginBottom: 6,
        border: `1.5px solid ${selected ? "#6EE7B7" : "#EBEBEB"}`,
        background: selected ? "#ECFDF5" : disabled ? "#F5F5F5" : "#FAFAF9",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .15s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="radio"
        name={name}
        id={id}
        checked={!!selected}
        onChange={disabled ? undefined : onChange}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
        style={{
          marginTop: 2,
          cursor: disabled ? "not-allowed" : "pointer",
          accentColor: "#059669",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: "#9A9693", marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      {selected && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 100,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            background: "#ECFDF5",
            color: "#059669",
            border: "1px solid #6EE7B7",
            flexShrink: 0,
          }}
        >
          Selected
        </span>
      )}
    </div>
  );
}

function StepDot({ active }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: active ? "#059669" : "#D1D5DB",
        flexShrink: 0,
        transition: "background .25s",
      }}
    />
  );
}

function LockedMessage({ reason }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "#FAFAF9",
        borderRadius: 10,
        fontSize: 12,
        color: "#9A9693",
        border: "1px solid #EBEBEB",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      🔒 {reason}
    </div>
  );
}

function SectionCard({ children, visible = true }) {
  if (!visible) return null;
  return (
    <div
      style={{
        border: "1px solid #EBEBEB",
        borderRadius: 16,
        marginBottom: "1rem",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function SectionHead({ icon, iconBg, title, sub, right }) {
  return (
    <div
      style={{
        padding: "0.875rem 1.25rem",
        borderBottom: "1px solid #F0EDE8",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#FAFAF9",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: "#9A9693", marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
  );
}

function PendingList({ items }) {
  if (items.length === 0) return null;
  return (
    <div
      style={{
        background: "#FFFBEB",
        border: "1px solid #FCD34D",
        borderRadius: 12,
        padding: "12px 16px",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#92400E",
          marginBottom: 8,
        }}
      >
        ⚠ Complete these before submitting:
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            color: "#B45309",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#FEF3C7",
              border: "1px solid #FCD34D",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "#D97706",
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          {item}
        </div>
      ))}
    </div>
  );
}

function BackendStatus({ error }) {
  if (!error) return null;
  const isNetwork =
    error.includes("not reachable") || error.includes("NETWORK");
  return (
    <div
      style={{
        margin: "0 0 1rem 0",
        padding: "12px 16px",
        borderRadius: 12,
        background: "#FFF8F0",
        border: "1px solid #FED7AA",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>🔌</span>
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#9A3412",
            marginBottom: 4,
          }}
        >
          {isNetwork ? "Backend Not Connected" : "Backend Error"}
        </div>
        <div style={{ fontSize: 12, color: "#C2410C", lineHeight: 1.6 }}>
          {error}
        </div>
        {isNetwork && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "#78350F",
              background: "#FEF3C7",
              padding: "6px 10px",
              borderRadius: 6,
              fontFamily: "monospace",
            }}
          >
            cd your-project && node server.js
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  LOGIN PAGE
// ═══════════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimIn(true), 50);
  }, []);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setPassword("");
    setError("");
  };

  const handleLogin = () => {
    if (!selectedRole) {
      setError("Please select a role first.");
      return;
    }
    const cred = ROLE_CREDENTIALS[selectedRole];
    if (password === cred.password) {
      onLogin(selectedRole);
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #16213E 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        padding: "1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -80,
          left: -80,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 480,
          opacity: animIn ? 1 : 0,
          transform: animIn ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-0.5px",
            }}
          >
            Resignation Portal
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            Select your role and enter password to continue
          </p>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              color: "rgba(255,255,255,0.35)",
              marginBottom: 12,
            }}
          >
            Select Role
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {Object.entries(ROLE_CREDENTIALS).map(([role, cfg]) => {
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1.5px solid",
                    borderColor: isSelected
                      ? cfg.color
                      : "rgba(255,255,255,0.1)",
                    background: isSelected
                      ? `${cfg.color}22`
                      : "rgba(255,255,255,0.03)",
                    color: isSelected ? cfg.color : "rgba(255,255,255,0.6)",
                    fontFamily: "inherit",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all .2s",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: isSelected
                      ? `0 0 0 1px ${cfg.color}44, 0 4px 12px ${cfg.color}22`
                      : "none",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                  <span style={{ lineHeight: 1.3 }}>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {selectedRole && (
            <div
              style={{ marginBottom: 20, animation: "fadeSlideIn 0.25s ease" }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 8,
                }}
              >
                Password
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder={`Enter password for ${ROLE_CREDENTIALS[selectedRole].label}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  style={{
                    width: "100%",
                    padding: "11px 44px 11px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${error ? "#EF4444" : "rgba(255,255,255,0.12)"}`,
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color .2s",
                  }}
                />
                <button
                  onClick={() => setShowPass((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                >
                  {showPass ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {error && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#EF4444",
                    marginTop: 6,
                    fontWeight: 500,
                  }}
                >
                  ⚠ {error}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!selectedRole}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 12,
              border: "none",
              background: selectedRole
                ? `linear-gradient(135deg, ${ROLE_CREDENTIALS[selectedRole]?.color}, ${ROLE_CREDENTIALS[selectedRole]?.color}CC)`
                : "rgba(255,255,255,0.08)",
              color: selectedRole ? "#fff" : "rgba(255,255,255,0.25)",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 700,
              cursor: selectedRole ? "pointer" : "not-allowed",
              transition: "all .2s",
              boxShadow: selectedRole
                ? `0 4px 20px ${ROLE_CREDENTIALS[selectedRole]?.color}44`
                : "none",
            }}
          >
            {selectedRole
              ? `Login as ${ROLE_CREDENTIALS[selectedRole].label}`
              : "Select a role to continue"}
          </button>

          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "rgba(255,255,255,0.25)",
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 6,
              }}
            >
              Demo Credentials
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "3px 16px",
              }}
            >
              {Object.entries(ROLE_CREDENTIALS).map(([role, cfg]) => (
                <div
                  key={role}
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}
                >
                  <span style={{ color: cfg.color, fontWeight: 600 }}>
                    {cfg.icon} {cfg.label.split(" ")[0]}:
                  </span>{" "}
                  {cfg.password}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  TOP NAV BAR
// ═══════════════════════════════════════════════════════════
function TopNav({ currentRole, onLogout }) {
  const cfg = ROLE_CREDENTIALS[currentRole];
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #EBEBEB",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 1.5rem",
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>
          Resignation Portal
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            background: cfg.bg,
            border: `1px solid ${cfg.color}33`,
            borderRadius: 100,
          }}
        >
          <span style={{ fontSize: 16 }}>{cfg.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        <button
          onClick={onLogout}
          style={{
            padding: "6px 14px",
            borderRadius: 100,
            border: "1.5px solid #EBEBEB",
            background: "#fff",
            color: "#666",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all .15s",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  HRClearance Component
// ═══════════════════════════════════════════════════════════
function HRClearance({ form, resignationId, currentRole }) {
  const [rmDecision, setRmDecision] = useState(null);
  const [rmComment, setRmComment] = useState("");
  const rmDone = rmDecision === "accept" && rmComment.trim().length > 0;

  const [hodDecision, setHodDecision] = useState(null);
  const [hodComment, setHodComment] = useState("");
  const hodDone = hodDecision === "accept" && hodComment.trim().length > 0;

  const libItems = [
    {
      id: "lib1",
      label: "All books returned",
      sub: "No borrowed books pending",
    },
    {
      id: "lib2",
      label: "Library card deactivated",
      sub: "Access card surrendered to library",
    },
  ];
  const [libSelected, setLibSelected] = useState(null);
  const [libHodDecision, setLibHodDecision] = useState(null);
  const [libHodComment, setLibHodComment] = useState("");

  const [otherDepts, setOtherDepts] = useState([]);
  const addOtherDept = () =>
    setOtherDepts((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        radioVal: null,
        hodDecision: null,
        hodComment: "",
      },
    ]);
  const removeOtherDept = (id) =>
    setOtherDepts((prev) => prev.filter((d) => d.id !== id));
  const updateDept = (id, key, val) =>
    setOtherDepts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [key]: val } : d)),
    );

  const adminItems = [
    {
      id: "adm-phone",
      label: "Phone returned",
      sub: "Company mobile phone returned to admin",
    },
    {
      id: "adm-id",
      label: "ID card surrendered",
      sub: "Employee ID card handed over",
    },
    {
      id: "adm-keys",
      label: "Keys returned",
      sub: "Office keys, cabinet keys returned",
    },
  ];
  const [adminChecked, setAdminChecked] = useState({});
  const [adminDecision, setAdminDecision] = useState(null);
  const [adminComment, setAdminComment] = useState("");
  const toggleAdmin = (id) =>
    setAdminChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const adminAllChecked = adminItems.every((i) => adminChecked[i.id]);
  const adminDone =
    adminAllChecked &&
    adminDecision === "accept" &&
    adminComment.trim().length > 0;

  const itItems = [
    {
      id: "it-email",
      label: "Email account disabled",
      sub: "All company email access removed",
    },
    {
      id: "it-system",
      label: "System access revoked",
      sub: "ERP / internal tools access closed",
    },
    {
      id: "it-vpn",
      label: "VPN access removed",
      sub: "No remote access allowed",
    },
    {
      id: "it-backup",
      label: "Data backup completed",
      sub: "User data safely archived",
    },
    {
      id: "it-laptop",
      label: "Laptop / Desktop returned",
      sub: "Company hardware handed over to IT",
    },
    {
      id: "it-deact",
      label: "Email & VPN deactivated",
      sub: "Email access revoked, VPN removed",
    },
  ];
  const [itChecked, setItChecked] = useState({});
  const [itDecision, setItDecision] = useState(null);
  const [itComment, setItComment] = useState("");
  const itAllChecked = itItems.every((i) => itChecked[i.id]);
  const itDone =
    itAllChecked && itDecision === "accept" && itComment.trim().length > 0;

  const hrItems = [
    {
      id: "hr-id",
      label: "ID Card collected",
      sub: "Employee ID card received by HR",
    },
    {
      id: "hr-docs",
      label: "All documents verified",
      sub: "Offer letter, resignation, etc",
    },
    {
      id: "hr-exit",
      label: "Exit interview completed",
      sub: "HR exit interview done",
    },
    {
      id: "hr-final",
      label: "Final settlement processed",
      sub: "Full & final settlement initiated",
    },
  ];
  const [hrChecked, setHrChecked] = useState({});
  const [hrDecision, setHrDecision] = useState(null);
  const [hrComment, setHrComment] = useState("");
  const hrAllChecked = hrItems.every((i) => hrChecked[i.id]);
  const hrDone =
    hrAllChecked && hrDecision === "accept" && hrComment.trim().length > 0;

  const accountsItems = [
    { id: "acc-loan", label: "Loan cleared", sub: "All dues settled" },
    { id: "acc-advance", label: "Advance cleared", sub: "No pending advance" },
  ];
  const [accountsChecked, setAccountsChecked] = useState({});
  const [accountsDecision, setAccountsDecision] = useState(null);
  const [accountsComment, setAccountsComment] = useState("");
  const toggleAccounts = (id) =>
    setAccountsChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const accAllChecked = accountsItems.every((i) => accountsChecked[i.id]);
  const accDone =
    accAllChecked &&
    accountsDecision === "accept" &&
    accountsComment.trim().length > 0;

  const [cleared, setCleared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedClearanceRows, setSavedClearanceRows] = useState([]);
  const [loadingSavedRows, setLoadingSavedRows] = useState(false);

  const fetchSavedClearance = useCallback(async () => {
    if (!resignationId) return;
    setLoadingSavedRows(true);
    try {
      const data = await safeFetch(`${API_BASE}/${resignationId}/clearance`);
      setSavedClearanceRows(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.warn("Unable to load saved clearance:", err.message);
      setSavedClearanceRows([]);
    } finally {
      setLoadingSavedRows(false);
    }
  }, [resignationId]);

  const [initialClearanceLoaded, setInitialClearanceLoaded] = useState(false);

  useEffect(() => {
    setInitialClearanceLoaded(false);
  }, [resignationId]);
  useEffect(() => {
    if (resignationId) fetchSavedClearance();
  }, [resignationId, fetchSavedClearance]);

  useEffect(() => {
    if (initialClearanceLoaded || savedClearanceRows.length === 0) return;

    const rmRow = savedClearanceRows.find(
      (r) => r.section_id === "rm" && r.item_id === "rm-decision",
    );
    const hodRow = savedClearanceRows.find(
      (r) => r.section_id === "hod" && r.item_id === "hod-decision",
    );
    const adminRows = savedClearanceRows.filter(
      (r) => r.section_id === "admin",
    );
    const itRows = savedClearanceRows.filter((r) => r.section_id === "it");
    const hrRows = savedClearanceRows.filter((r) => r.section_id === "hr");
    const financeRows = savedClearanceRows.filter(
      (r) => r.section_id === "finance",
    );
    const libraryRows = savedClearanceRows.filter(
      (r) => r.section_id === "library",
    );

    if (rmRow) {
      const { decision, comment } = parseDecisionFromRow(rmRow);
      setRmDecision(decision);
      setRmComment(comment);
    }
    if (hodRow) {
      const { decision, comment } = parseDecisionFromRow(hodRow);
      setHodDecision(decision);
      setHodComment(comment);
    }

    if (libraryRows.length) {
      const selected = libraryRows.find((r) => r.is_checked);
      if (selected) setLibSelected(selected.item_id);
      const { decision, comment } = parseDecisionFromRow(libraryRows[0]);
      setLibHodDecision(decision);
      setLibHodComment(comment);
    }

    setAdminChecked(
      adminRows.reduce(
        (acc, r) => ({ ...acc, [r.item_id]: !!r.is_checked }),
        {},
      ),
    );
    if (adminRows.length) {
      const { decision, comment } = parseDecisionFromRow(adminRows[0]);
      setAdminDecision(decision);
      setAdminComment(comment);
    }

    setItChecked(
      itRows.reduce((acc, r) => ({ ...acc, [r.item_id]: !!r.is_checked }), {}),
    );
    if (itRows.length) {
      const { decision, comment } = parseDecisionFromRow(itRows[0]);
      setItDecision(decision);
      setItComment(comment);
    }

    setHrChecked(
      hrRows.reduce((acc, r) => ({ ...acc, [r.item_id]: !!r.is_checked }), {}),
    );
    if (hrRows.length) {
      const { decision, comment } = parseDecisionFromRow(hrRows[0]);
      setHrDecision(decision);
      setHrComment(comment);
    }

    setAccountsChecked(
      financeRows.reduce(
        (acc, r) => ({ ...acc, [r.item_id]: !!r.is_checked }),
        {},
      ),
    );
    if (financeRows.length) {
      const { decision, comment } = parseDecisionFromRow(financeRows[0]);
      setAccountsDecision(decision);
      setAccountsComment(comment);
    }

    setInitialClearanceLoaded(true);
  }, [savedClearanceRows, initialClearanceLoaded]);

  const hrCanSeeAll = currentRole === "hr" && hodDone;

  const getPendingItems = () => {
    const items = [];
    if (currentRole === "rm") {
      if (!rmDecision) items.push("Provide acceptance or rejection decision");
      if (rmDecision && !rmComment.trim())
        items.push("Write a comment (required)");
    }
    if (currentRole === "hod") {
      if (!rmDone)
        items.push(
          "Immediate Boss has not accepted yet — they must do so first",
        );
      else if (!hodDecision) items.push("Provide HOD decision (accept/reject)");
      else if (!hodComment.trim()) items.push("Write HOD comment (required)");
    }
    if (currentRole === "admin") {
      adminItems.forEach((i) => {
        if (!adminChecked[i.id]) items.push(`Check the "${i.label}" checkbox`);
      });
      if (adminAllChecked && !adminDecision)
        items.push("Admin Confirmation — accept or reject");
      if (adminAllChecked && adminDecision && !adminComment.trim())
        items.push("Write admin comment (required)");
    }
    if (currentRole === "finance") {
      accountsItems.forEach((i) => {
        if (!accountsChecked[i.id])
          items.push(`Check the "${i.label}" checkbox`);
      });
      if (accAllChecked && !accountsDecision)
        items.push("Finance Lead — provide final decision");
      if (accAllChecked && accountsDecision && !accountsComment.trim())
        items.push("Write finance comment (required)");
    }
    if (currentRole === "hr") {
      if (!rmDone) items.push("Immediate Boss has not accepted yet");
      if (!hodDone) items.push("Department Head has not accepted yet");
      if (hodDone) {
        itItems.forEach((i) => {
          if (!itChecked[i.id])
            items.push(`IT: Check the "${i.label}" checkbox`);
        });
        if (itAllChecked && !itDecision)
          items.push("IT Head Confirmation — provide decision");
        if (itAllChecked && itDecision && !itComment.trim())
          items.push("Write IT comment (required)");
        hrItems.forEach((i) => {
          if (!hrChecked[i.id])
            items.push(`HR: Check the "${i.label}" checkbox`);
        });
        if (hrAllChecked && !hrDecision)
          items.push("HR Final Approval — provide decision");
        if (hrAllChecked && hrDecision && !hrComment.trim())
          items.push("Write HR comment (required)");
      }
    }
    return items;
  };

  const canSubmit =
    currentRole === "rm"
      ? rmDecision === "accept" && rmComment.trim().length > 0
      : currentRole === "hod"
        ? rmDone && hodDecision === "accept" && hodComment.trim().length > 0
        : currentRole === "admin"
          ? adminAllChecked &&
            adminDecision === "accept" &&
            adminComment.trim().length > 0
          : currentRole === "finance"
            ? accAllChecked &&
              accountsDecision === "accept" &&
              accountsComment.trim().length > 0
            : currentRole === "hr"
              ? rmDone &&
                hodDone &&
                itAllChecked &&
                itDecision === "accept" &&
                itComment.trim().length > 0 &&
                hrAllChecked &&
                hrDecision === "accept" &&
                hrComment.trim().length > 0
              : false;

  const pendingItems = getPendingItems();

  const handleSubmitClearance = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setSaveError(null);
    const allDone =
      rmDone && hodDone && adminDone && itDone && hrDone && accDone;
    const note = (decision, comment) =>
      decision ? `${decision.toUpperCase()}: ${comment}` : "";
    const sectionsByRole = {
      rm: [
        {
          sectionId: "rm",
          sectionTitle: "Immediate Boss Clearance",
          items: [
            {
              id: "rm-decision",
              label: "Reporting Manager decision",
              checked: rmDecision === "accept",
              note: note(rmDecision, rmComment),
            },
          ],
        },
      ],
      hod: [
        {
          sectionId: "hod",
          sectionTitle: "Department Head Clearance",
          items: [
            {
              id: "hod-decision",
              label: "HOD decision",
              checked: hodDecision === "accept",
              note: note(hodDecision, hodComment),
            },
          ],
        },
      ],
      admin: [
        {
          sectionId: "admin",
          sectionTitle: "Admin Clearance",
          items: adminItems.map((item) => ({
            id: item.id,
            label: item.label,
            checked: Boolean(adminChecked[item.id]),
            note: note(adminDecision, adminComment),
          })),
        },
      ],
      finance: [
        {
          sectionId: "finance",
          sectionTitle: "Finance Clearance",
          items: accountsItems.map((item) => ({
            id: item.id,
            label: item.label,
            checked: Boolean(accountsChecked[item.id]),
            note: note(accountsDecision, accountsComment),
          })),
        },
      ],
      hr: [
        {
          sectionId: "library",
          sectionTitle: "Library",
          items: libItems.map((item) => ({
            id: item.id,
            label: item.label,
            checked: libSelected === item.id,
            note: note(libHodDecision, libHodComment),
          })),
        },
        {
          sectionId: "it",
          sectionTitle: "IT Clearance",
          items: itItems.map((item) => ({
            id: item.id,
            label: item.label,
            checked: Boolean(itChecked[item.id]),
            note: note(itDecision, itComment),
          })),
        },
        {
          sectionId: "hr",
          sectionTitle: "HR Clearance",
          items: hrItems.map((item) => ({
            id: item.id,
            label: item.label,
            checked: Boolean(hrChecked[item.id]),
            note: note(hrDecision, hrComment),
          })),
        },
      ],
    };
    const payload = {
      resignationId,
      empId: form.empId,
      employeeName: form.name,
      employeeEmail: form.email,
      submittedAt: new Date().toISOString(),
      submittedByRole: currentRole,
      allCompleted: allDone,
      clearanceSections: sectionsByRole[currentRole] || [],
    };
    try {
      await safeFetch(`${API_BASE}/${resignationId}/clearance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setCleared(true);
      await fetchSavedClearance();
      setInitialClearanceLoaded(false);
      playNotificationSound();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const roleCfg = ROLE_CREDENTIALS[currentRole] || {};

  return (
    <div className="rf-card" style={{ marginTop: "1.5rem" }}>
      <div className="rf-card-header">
        <div className="rf-card-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div>
          <p className="rf-card-title">HR Clearance Form</p>
          <p className="rf-card-sub">
            Sequential approval: RM → HOD → HR / Admin / Finance
          </p>
        </div>
        {/* ── Role badge only, NO resignation ID ── */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              background: roleCfg.bg,
              border: `1px solid ${roleCfg.color}44`,
              borderRadius: 100,
            }}
          >
            <span style={{ fontSize: 14 }}>{roleCfg.icon}</span>
            <span
              style={{ fontSize: 11, fontWeight: 700, color: roleCfg.color }}
            >
              Logged in as: {roleCfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* Employee Info Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 10,
          padding: "1rem 2rem",
          background: "#FAFAF9",
          borderBottom: "1px solid #F0EDE8",
        }}
      >
        {[
          ["Employee Name", form.name],
          ["Email", form.email],
          ["Designation", form.designation],
          ["Department", form.department],
          ["Last Working Day", fmtDate(form.lastDate)],
        ].map(([label, val]) => (
          <div key={label}>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                color: "#9A9693",
                fontWeight: 600,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1A1A1A",
                marginTop: 3,
                wordBreak: "break-word",
              }}
            >
              {val || "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          padding: "0.875rem 2rem",
          background: "#F0F9F7",
          borderBottom: "1px solid #E0F2EB",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "#1B4D42",
            letterSpacing: ".05em",
          }}
        >
          Progress:
        </span>
        {[
          ["RM Accept", rmDone],
          ["HOD Accept", hodDone],
          ["Admin Done", adminDone],
          ["IT Done", itDone],
          ["HR Done", hrDone],
          ["Finance Final", accDone],
        ].map(([label, done]) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <StepDot active={done} />
            <span
              style={{
                fontSize: 11,
                color: done ? "#059669" : "#9A9693",
                fontWeight: done ? 600 : 400,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        {/* Role-specific access notice */}
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            background: roleCfg.bg,
            border: `1px solid ${roleCfg.color}33`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>{roleCfg.icon}</span>
          <div>
            <div
              style={{ fontSize: 12, fontWeight: 700, color: roleCfg.color }}
            >
              {roleCfg.label} — Clearance Panel
            </div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
              {currentRole === "employee" &&
                "You can view this form after submission."}
              {currentRole === "rm" &&
                "You can accept or reject the resignation below."}
              {currentRole === "hod" &&
                "You can act after the Immediate Boss accepts."}
              {currentRole === "hr" &&
                "You can manage IT, Library, and HR clearance after HOD accepts."}
              {currentRole === "admin" &&
                "Fill admin clearance checklist below."}
              {currentRole === "finance" && "Finalize financial dues below."}
            </div>
          </div>
        </div>

        {/* STEP 1: RM */}
        {(currentRole === "rm" || hrCanSeeAll) && (
          <SectionCard>
            <SectionHead
              iconBg="#EEEDFE"
              icon={
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#534AB7"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
              title="Step 1 — Immediate Boss (Reporting Manager)"
              sub="RM must accept first. No other step opens without this."
              right={
                rmDone ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#ECFDF5",
                      color: "#059669",
                      border: "1px solid #6EE7B7",
                    }}
                  >
                    ✓ Accepted
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#FFFBEB",
                      color: "#D97706",
                      border: "1px solid #FCD34D",
                    }}
                  >
                    Pending
                  </span>
                )
              }
            />
            <div style={{ padding: "1rem 1.25rem" }}>
              <ApprovalButtons
                label="Immediate Boss Decision"
                value={rmDecision}
                comment={rmComment}
                onDecision={(v) => {
                  if (currentRole === "rm" || hrCanSeeAll) setRmDecision(v);
                }}
                onComment={(v) => {
                  if (currentRole === "rm" || hrCanSeeAll) setRmComment(v);
                }}
                disabled={currentRole !== "rm" && !hrCanSeeAll}
              />
              {!rmDone && rmDecision && !rmComment.trim() && (
                <div style={{ fontSize: 11, color: "#E05C5C", marginTop: 6 }}>
                  ⚠ Comment is mandatory.
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* STEP 2: HOD */}
        {(currentRole === "hod" || hrCanSeeAll) && (
          <SectionCard>
            <SectionHead
              iconBg="#EAF3DE"
              icon={
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3B6D11"
                  strokeWidth="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              title="Step 2 — Department Head (HOD)"
              sub={
                rmDone
                  ? "RM has accepted. HOD can now approve or reject."
                  : "🔒 Waiting for Immediate Boss to accept first."
              }
              right={
                hodDone ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#ECFDF5",
                      color: "#059669",
                      border: "1px solid #6EE7B7",
                    }}
                  >
                    ✓ Accepted
                  </span>
                ) : rmDone ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#FFFBEB",
                      color: "#D97706",
                      border: "1px solid #FCD34D",
                    }}
                  >
                    Pending
                  </span>
                ) : null
              }
            />
            <div style={{ padding: "1rem 1.25rem" }}>
              {!rmDone ? (
                <LockedMessage reason="Immediate Boss must accept the resignation before HOD can act." />
              ) : (
                <>
                  <ApprovalButtons
                    label="Department Head Decision"
                    value={hodDecision}
                    comment={hodComment}
                    onDecision={(v) => {
                      if (currentRole === "hod" || hrCanSeeAll)
                        setHodDecision(v);
                    }}
                    onComment={(v) => {
                      if (currentRole === "hod" || hrCanSeeAll)
                        setHodComment(v);
                    }}
                    disabled={currentRole !== "hod" && !hrCanSeeAll}
                  />
                  {!hodDone && hodDecision && !hodComment.trim() && (
                    <div
                      style={{ fontSize: 11, color: "#E05C5C", marginTop: 6 }}
                    >
                      ⚠ Comment is mandatory!
                    </div>
                  )}
                </>
              )}
            </div>
          </SectionCard>
        )}

        {/* LIBRARY */}
        {hrCanSeeAll && (
          <SectionCard>
            <SectionHead
              iconBg="#E6F1FB"
              icon={
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#185FA5"
                  strokeWidth="2"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              }
              title="Library Clearance"
              sub="Select returned item and record approval"
              right={
                libSelected && libHodDecision ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#ECFDF5",
                      color: "#059669",
                      border: "1px solid #6EE7B7",
                    }}
                  >
                    Done
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#FFFBEB",
                      color: "#D97706",
                      border: "1px solid #FCD34D",
                    }}
                  >
                    Pending
                  </span>
                )
              }
            />
            <div style={{ padding: "1rem 1.25rem" }}>
              {libItems.map((item) => (
                <RadioItem
                  key={item.id}
                  name="library-clearance"
                  id={item.id}
                  label={item.label}
                  sub={item.sub}
                  selected={libSelected === item.id}
                  onChange={() => setLibSelected(item.id)}
                />
              ))}
              {libSelected && (
                <>
                  <Divider />
                  <ApprovalButtons
                    label="Library Clearance"
                    value={libHodDecision}
                    comment={libHodComment}
                    onDecision={setLibHodDecision}
                    onComment={setLibHodComment}
                  />
                </>
              )}
            </div>
          </SectionCard>
        )}

        {/* OTHER DEPARTMENTS */}
        {((currentRole === "hod" && rmDone) || hrCanSeeAll) && (
          <SectionCard>
            <SectionHead
              iconBg="#FEF3C7"
              icon={
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#B45309"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              }
              title="Other Departments"
              sub="HOD adds departments and collects sign-off"
              right={
                <span style={{ fontSize: 11, color: "#9A9693" }}>
                  {otherDepts.length} dept{otherDepts.length !== 1 ? "s" : ""}
                </span>
              }
            />
            <div style={{ padding: "1rem 1.25rem" }}>
              {otherDepts.length === 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#9A9693",
                    marginBottom: 10,
                    fontStyle: "italic",
                  }}
                >
                  No departments added yet.
                </div>
              )}
              {otherDepts.map((dept, idx) => (
                <div
                  key={dept.id}
                  style={{
                    border: "1px solid #EBEBEB",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 10,
                    background: "#FAFAF9",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#9A9693",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      Department {idx + 1}
                    </span>
                    <button
                      onClick={() => removeOtherDept(dept.id)}
                      style={{
                        marginLeft: "auto",
                        background: "#FFF1F2",
                        border: "1px solid #FCA5A5",
                        color: "#DC2626",
                        borderRadius: 6,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    placeholder="Department name..."
                    value={dept.name}
                    onChange={(e) =>
                      updateDept(dept.id, "name", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1.5px solid #E8E5E0",
                      background: "#fff",
                      fontFamily: "inherit",
                      fontSize: 13,
                      color: "#1A1A1A",
                      outline: "none",
                      marginBottom: 10,
                    }}
                  />
                  <RadioItem
                    name={`dept-${dept.id}`}
                    id={`${dept.id}-done`}
                    label="Clearance completed"
                    sub="All items returned/settled"
                    selected={dept.radioVal === "done"}
                    onChange={() => updateDept(dept.id, "radioVal", "done")}
                  />
                  <RadioItem
                    name={`dept-${dept.id}`}
                    id={`${dept.id}-pend`}
                    label="Items pending"
                    sub="Some items still outstanding"
                    selected={dept.radioVal === "pending"}
                    onChange={() => updateDept(dept.id, "radioVal", "pending")}
                  />
                  {dept.radioVal && (
                    <>
                      <Divider />
                      <ApprovalButtons
                        label={`HOD Approval${dept.name ? ` — ${dept.name}` : ""}`}
                        value={dept.hodDecision}
                        comment={dept.hodComment}
                        onDecision={(val) =>
                          updateDept(dept.id, "hodDecision", val)
                        }
                        onComment={(val) =>
                          updateDept(dept.id, "hodComment", val)
                        }
                      />
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={addOtherDept}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1.5px solid #E8E5E0",
                  background: "#fff",
                  color: "#555",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Department
              </button>
            </div>
          </SectionCard>
        )}

        {/* ADMIN CLEARANCE */}
        {(currentRole === "admin" || hrCanSeeAll) && (
          <SectionCard>
            <SectionHead
              iconBg="#E6F1FB"
              icon={
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#185FA5"
                  strokeWidth="2"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              }
              title="Admin Clearance"
              sub={
                currentRole === "admin"
                  ? "Check returned items and confirm."
                  : "Admin section — viewable by HR Head"
              }
              right={
                adminDone ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#ECFDF5",
                      color: "#059669",
                      border: "1px solid #6EE7B7",
                    }}
                  >
                    ✓ Done
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#FFFBEB",
                      color: "#D97706",
                      border: "1px solid #FCD34D",
                    }}
                  >
                    Pending
                  </span>
                )
              }
            />
            <div style={{ padding: "1rem 1.25rem" }}>
              {adminItems.map((item) => (
                <CheckboxItem
                  key={item.id}
                  label={item.label}
                  sub={item.sub}
                  checked={Boolean(adminChecked[item.id])}
                  onChange={() => toggleAdmin(item.id)}
                  disabled={currentRole !== "admin" && !hrCanSeeAll}
                />
              ))}
              {adminAllChecked ? (
                <>
                  <Divider />
                  <ApprovalButtons
                    label="Admin Confirmation"
                    value={adminDecision}
                    comment={adminComment}
                    onDecision={(v) => {
                      if (currentRole === "admin" || hrCanSeeAll)
                        setAdminDecision(v);
                    }}
                    onComment={(v) => {
                      if (currentRole === "admin" || hrCanSeeAll)
                        setAdminComment(v);
                    }}
                    disabled={currentRole !== "admin" && !hrCanSeeAll}
                  />
                  {adminDecision && !adminComment.trim() && (
                    <div
                      style={{ fontSize: 11, color: "#E05C5C", marginTop: 6 }}
                    >
                      ⚠ Comment is mandatory.
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: "#B45309",
                    marginTop: 6,
                    padding: "8px 12px",
                    background: "#FFFBEB",
                    borderRadius: 8,
                    border: "1px solid #FCD34D",
                  }}
                >
                  ⚠ The Confirmation section will be visible only after all
                  items are checked.
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* IT CLEARANCE */}
        {hrCanSeeAll && (
          <SectionCard>
            <SectionHead
              iconBg="#F3E8FF"
              icon={
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="2"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                </svg>
              }
              title="IT Clearance"
              sub="HR Head fills after HOD approval"
              right={
                itDone ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#ECFDF5",
                      color: "#059669",
                      border: "1px solid #6EE7B7",
                    }}
                  >
                    ✓ Done
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#FFFBEB",
                      color: "#D97706",
                      border: "1px solid #FCD34D",
                    }}
                  >
                    Pending
                  </span>
                )
              }
            />
            <div style={{ padding: "1rem 1.25rem" }}>
              {itItems.map((item) => (
                <CheckboxItem
                  key={item.id}
                  label={item.label}
                  sub={item.sub}
                  checked={Boolean(itChecked[item.id])}
                  onChange={() =>
                    setItChecked((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                />
              ))}
              {itAllChecked ? (
                <>
                  <Divider />
                  <ApprovalButtons
                    label="IT Head Confirmation"
                    value={itDecision}
                    comment={itComment}
                    onDecision={setItDecision}
                    onComment={setItComment}
                  />
                  {itDecision && !itComment.trim() && (
                    <div
                      style={{ fontSize: 11, color: "#E05C5C", marginTop: 6 }}
                    >
                      ⚠ Comment is mandatory.
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: "#B45309",
                    marginTop: 6,
                    padding: "8px 12px",
                    background: "#FFFBEB",
                    borderRadius: 8,
                    border: "1px solid #FCD34D",
                  }}
                >
                  ⚠ The Confirmation section will be visible only after all IT
                  items are checked.
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* HR CLEARANCE */}
        {hrCanSeeAll && (
          <SectionCard>
            <SectionHead
              iconBg="#FFF0F6"
              icon={
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#BE185D"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
              title="HR Final Review"
              sub="Exit interview, documents, settlement"
              right={
                hrDone ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#ECFDF5",
                      color: "#059669",
                      border: "1px solid #6EE7B7",
                    }}
                  >
                    ✓ Done
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#FFFBEB",
                      color: "#D97706",
                      border: "1px solid #FCD34D",
                    }}
                  >
                    Pending
                  </span>
                )
              }
            />
            <div style={{ padding: "1rem 1.25rem" }}>
              {hrItems.map((item) => (
                <CheckboxItem
                  key={item.id}
                  label={item.label}
                  sub={item.sub}
                  checked={Boolean(hrChecked[item.id])}
                  onChange={() =>
                    setHrChecked((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                />
              ))}
              {hrAllChecked ? (
                <>
                  <Divider />
                  <ApprovalButtons
                    label="HR Head Final Approval"
                    value={hrDecision}
                    comment={hrComment}
                    onDecision={setHrDecision}
                    onComment={setHrComment}
                  />
                  {hrDecision && !hrComment.trim() && (
                    <div
                      style={{ fontSize: 11, color: "#E05C5C", marginTop: 6 }}
                    >
                      ⚠ Comment is mandatory.
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: "#B45309",
                    marginTop: 6,
                    padding: "8px 12px",
                    background: "#FFFBEB",
                    borderRadius: 8,
                    border: "1px solid #FCD34D",
                  }}
                >
                  ⚠ The Final Approval section will be visible only after all HR
                  items are checked.
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* FINANCE */}
        {(currentRole === "finance" || hrCanSeeAll) && (
          <SectionCard>
            <SectionHead
              iconBg="#F1F5FF"
              icon={
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2"
                >
                  <path d="M3 7h18M3 12h18M3 17h18" />
                </svg>
              }
              title="Finance — Final Clearance"
              sub="Finance team finalizes all dues before full clearance is granted"
              right={
                accDone ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#ECFDF5",
                      color: "#059669",
                      border: "1px solid #6EE7B7",
                    }}
                  >
                    ✓ Finalized
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 100,
                      textTransform: "uppercase",
                      background: "#FFFBEB",
                      color: "#D97706",
                      border: "1px solid #FCD34D",
                    }}
                  >
                    Pending
                  </span>
                )
              }
            />
            <div style={{ padding: "1rem 1.25rem" }}>
              {accountsItems.map((item) => (
                <CheckboxItem
                  key={item.id}
                  label={item.label}
                  sub={item.sub}
                  checked={Boolean(accountsChecked[item.id])}
                  onChange={() => toggleAccounts(item.id)}
                  disabled={currentRole !== "finance" && !hrCanSeeAll}
                />
              ))}
              {accAllChecked ? (
                <>
                  <Divider />
                  <ApprovalButtons
                    label="Finance Lead — Final Sign-off"
                    value={accountsDecision}
                    comment={accountsComment}
                    onDecision={(v) => {
                      if (currentRole === "finance" || hrCanSeeAll)
                        setAccountsDecision(v);
                    }}
                    onComment={(v) => {
                      if (currentRole === "finance" || hrCanSeeAll)
                        setAccountsComment(v);
                    }}
                    disabled={currentRole !== "finance" && !hrCanSeeAll}
                  />
                  {accountsDecision && !accountsComment.trim() && (
                    <div
                      style={{ fontSize: 11, color: "#E05C5C", marginTop: 6 }}
                    >
                      ⚠ Comment is mandatory.
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: "#B45309",
                    marginTop: 6,
                    padding: "8px 12px",
                    background: "#FFFBEB",
                    borderRadius: 8,
                    border: "1px solid #FCD34D",
                  }}
                >
                  ⚠ The Sign-off section will be visible only after all Finance
                  items are checked.
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Role info messages */}
        {currentRole === "rm" && !rmDone && (
          <div
            style={{
              background: "#FFFBEB",
              border: "1px solid #FCD34D",
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 13,
              color: "#92400E",
              marginTop: 8,
            }}
          >
            ⚠ After accepting and adding a comment, the Department Head will be
            notified.
          </div>
        )}
        {currentRole === "hod" && !rmDone && (
          <div
            style={{
              background: "#F5F5F5",
              border: "1px solid #EBEBEB",
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 13,
              color: "#666",
            }}
          >
            🔒 Immediate Boss has not accepted the resignation yet. HOD cannot
            take any action.
          </div>
        )}
        {currentRole === "employee" && (
          <div
            style={{
              background: "#F0F9FF",
              border: "1px solid #BAE6FD",
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 13,
              color: "#0369A1",
            }}
          >
            👁️ You can track the clearance progress here. Actions are performed
            by HR, Admin, and Finance.
          </div>
        )}

        {saveError && <BackendStatus error={saveError} />}
        {!canSubmit && !cleared && <PendingList items={pendingItems} />}

        {/* SUBMIT ROW */}
        {currentRole !== "employee" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 0",
              borderTop: "1px solid #F0EDE8",
              marginTop: "0.5rem",
            }}
          >
            <div style={{ fontSize: 12, color: "#9A9693" }}>
              {canSubmit ? (
                <span style={{ color: "#059669", fontWeight: 600 }}>
                  ✓ All completed — Submit as{" "}
                  {ROLE_CREDENTIALS[currentRole]?.label}
                </span>
              ) : (
                <span style={{ color: "#B45309" }}>
                  Complete the pending items above first.
                </span>
              )}
            </div>
            {cleared ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#ECFDF5",
                  border: "1px solid #6EE7B7",
                  color: "#059669",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Submitted!
              </div>
            ) : (
              <button
                disabled={!canSubmit || saving}
                onClick={handleSubmitClearance}
                style={{
                  background: canSubmit ? "#1A1A1A" : "#E8E5E0",
                  color: canSubmit ? "#fff" : "#9A9693",
                  border: "none",
                  padding: "11px 24px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  transition: "all .15s",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {saving
                  ? "Submitting..."
                  : `Submit as ${ROLE_CREDENTIALS[currentRole]?.label}`}
              </button>
            )}
          </div>
        )}

        {/* Clearance data is stored in the backend only — not displayed here */}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  EMPLOYEE RESIGNATION FORM
// ═══════════════════════════════════════════════════════════
function EmployeeResignationForm() {
  const [form, setForm] = useState({
    empId: "",
    name: "",
    email: "",
    designation: "",
    department: "",
    joiningDate: "",
    lastDate: "",
    reason: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showClearance, setShowClearance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [resignationId, setResignationId] = useState(null);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: null }));
  };

  const validate = () => {
    const e = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.empId.trim()) e.empId = "Required";
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!emailRegex.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.designation.trim()) e.designation = "Required";
    if (!form.department.trim()) e.department = "Required";
    if (!form.joiningDate) e.joiningDate = "Required";
    if (!form.lastDate) e.lastDate = "Required";
    if (!form.reason.trim()) e.reason = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = await safeFetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setResignationId(data.id);
      setSubmitted(true);
      setShowClearance(true);
      setTimeout(
        () =>
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          }),
        100,
      );
      playNotificationSound();
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="rf-card">
        <div className="rf-card-header">
          <div className="rf-card-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <p className="rf-card-title">Resignation Form</p>
            <p className="rf-card-sub">Fill in employee details and submit</p>
          </div>
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "#9A9693",
              background: "#F0EDE8",
              padding: "4px 10px",
              borderRadius: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10B981",
                display: "inline-block",
              }}
            />
            Saves to MySQL
          </span>
        </div>

        <div className="rf-card-body">
          <div className="rf-grid">
            <div className="rf-field">
              <label className="rf-label">
                Employee ID <span>*</span>
              </label>
              <input
                className={`rf-input${errors.empId ? " rf-err" : ""}`}
                placeholder="e.g. EMP001"
                value={form.empId}
                onChange={set("empId")}
              />
              {errors.empId && (
                <span className="rf-error-msg">⚠ {errors.empId}</span>
              )}
            </div>
            <div className="rf-field">
              <label className="rf-label">
                Employee Name <span>*</span>
              </label>
              <input
                className={`rf-input${errors.name ? " rf-err" : ""}`}
                placeholder="Full name"
                value={form.name}
                onChange={set("name")}
              />
              {errors.name && (
                <span className="rf-error-msg">⚠ {errors.name}</span>
              )}
            </div>
            <div className="rf-field">
              <label className="rf-label">
                Employee Email ID <span>*</span>
              </label>
              <input
                className={`rf-input${errors.email ? " rf-err" : ""}`}
                type="email"
                placeholder="employee@company.com"
                value={form.email}
                onChange={set("email")}
              />
              {errors.email && (
                <span className="rf-error-msg">⚠ {errors.email}</span>
              )}
            </div>
            <div className="rf-field">
              <label className="rf-label">
                Designation <span>*</span>
              </label>
              <input
                className={`rf-input${errors.designation ? " rf-err" : ""}`}
                placeholder="e.g. Software Engineer"
                value={form.designation}
                onChange={set("designation")}
              />
              {errors.designation && (
                <span className="rf-error-msg">⚠ {errors.designation}</span>
              )}
            </div>
            <div className="rf-field">
              <label className="rf-label">
                Department <span>*</span>
              </label>
              <input
                className={`rf-input${errors.department ? " rf-err" : ""}`}
                placeholder="e.g. Engineering, HR, Finance"
                value={form.department}
                onChange={set("department")}
              />
              {errors.department && (
                <span className="rf-error-msg">⚠ {errors.department}</span>
              )}
            </div>
            <div className="rf-field">
              <label className="rf-label">
                Joining Date <span>*</span>
              </label>
              <input
                type="date"
                className={`rf-input${errors.joiningDate ? " rf-err" : ""}`}
                value={form.joiningDate}
                onChange={set("joiningDate")}
              />
              {errors.joiningDate && (
                <span className="rf-error-msg">⚠ {errors.joiningDate}</span>
              )}
            </div>
            <div className="rf-field">
              <label className="rf-label">
                Last Working Day <span>*</span>
              </label>
              <input
                type="date"
                className={`rf-input${errors.lastDate ? " rf-err" : ""}`}
                value={form.lastDate}
                onChange={set("lastDate")}
              />
              {errors.lastDate && (
                <span className="rf-error-msg">⚠ {errors.lastDate}</span>
              )}
            </div>
            <div className="rf-field" style={{ gridColumn: "span 2" }}>
              <label className="rf-label">
                Reason for Resignation <span>*</span>
              </label>
              <textarea
                className={`rf-input${errors.reason ? " rf-err" : ""}`}
                placeholder="Please provide a brief reason…"
                value={form.reason}
                onChange={set("reason")}
              />
              {errors.reason && (
                <span className="rf-error-msg">⚠ {errors.reason}</span>
              )}
            </div>
          </div>

          <hr className="rf-divider" />

          {submitError && <BackendStatus error={submitError} />}

          <button
            className="rf-submit"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {submitting ? "Submitting..." : "Submit & Preview"}
          </button>
        </div>
      </div>

      {/* ── Resignation Letter Preview — no ID badge, no status badge ── */}
      {submitted && (
        <div
          className="rf-card"
          id="resignation-preview"
          style={{ padding: "2.5rem" }}
        >
          <div className="rf-preview-letterhead">
            <div>
              <p className="rf-preview-title">Resignation Letter</p>
              <p className="rf-preview-sub">
                Official Record ·{" "}
                {fmtDate(new Date().toISOString().split("T")[0])}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div
              style={{
                flex: 1,
                padding: "10px 14px",
                background: "#E6F1FB",
                border: "1px solid #B5D4F4",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  color: "#185FA5",
                  fontWeight: 600,
                }}
              >
                Employee Email
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#185FA5",
                  marginTop: 2,
                }}
              >
                {form.email}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <p
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                fontFamily: "'DM Serif Display', serif",
                letterSpacing: "-.3px",
              }}
            >
              {form.name || "—"}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 8,
              }}
            >
              {[
                ["Designation", form.designation],
                ["Department", form.department],
              ].map(([label, val]) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#9A9693",
                      width: 90,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{ fontSize: 13, color: "#1A1A1A", fontWeight: 500 }}
                  >
                    — {val || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rf-info-grid">
            <div className="rf-info-box">
              <small>Joining Date</small>
              <p>{fmtDate(form.joiningDate)}</p>
            </div>
            <div className="rf-info-box">
              <small>Last Working Day</small>
              <p>{fmtDate(form.lastDate)}</p>
            </div>
            <div className="rf-info-box" style={{ gridColumn: "span 2" }}>
              <small>Total Service Tenure</small>
              <p>{calcTenure(form.joiningDate, form.lastDate)}</p>
            </div>
          </div>

          <p className="rf-reason-label">Reason for Resignation</p>
          <div className="rf-reason-block">{form.reason}</div>

          <div className="rf-sig-row">
            <div className="rf-sig">
              <div className="rf-sig-line" />
              <small>Employee Signature</small>
            </div>
            <div className="rf-sig">
              <div className="rf-sig-line" style={{ borderColor: "#CCC" }} />
              <small>Department Head Approval</small>
            </div>
          </div>

          <div
            id="print-btn-row"
            style={{
              marginTop: "2rem",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button className="rf-print-btn" onClick={() => window.print()}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Official Copy
            </button>
          </div>
        </div>
      )}

      {showClearance && (
        <HRClearance
          form={form}
          resignationId={resignationId}
          currentRole="employee"
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  CLEARANCE-ONLY VIEW (for non-employee roles)
// ═══════════════════════════════════════════════════════════
function ClearanceOnlyView({ currentRole }) {
  const [resignationId, setResignationId] = useState("");
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const handleFetch = async () => {
    const id = resignationId.trim();
    if (!id) return;
    setLoading(true);
    setFetchError(null);
    setForm(null);
    try {
      const res = await safeFetch(`${API_BASE}/${id}`);
      const data = res.data || res;
      setForm({
        id: data.id,
        empId: data.empId || data.emp_id || "",
        name: data.name || data.employee_name || "",
        email: data.email || data.employee_email || "",
        designation: data.designation || "",
        department: data.department || "",
        joiningDate: data.joiningDate || data.joining_date || "",
        lastDate: data.lastDate || data.last_working_day || "",
        reason: data.reason || "",
      });
    } catch (err) {
      setFetchError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const roleCfg = ROLE_CREDENTIALS[currentRole] || {};

  return (
    <div>
      <div className="rf-card">
        <div className="rf-card-header">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: roleCfg.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {roleCfg.icon}
          </div>
          <div>
            <p className="rf-card-title">{roleCfg.label} — Clearance Panel</p>
            <p className="rf-card-sub">
              Enter the reference number to load the clearance form
            </p>
          </div>
        </div>
        <div className="rf-card-body">
          {/* Reference number input — label shows neutral text, not "Resignation ID" */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div className="rf-field" style={{ flex: 1 }}>
              <label className="rf-label">Reference Number</label>
              <input
                className="rf-input"
                placeholder="Enter reference number"
                value={resignationId}
                onChange={(e) => {
                  setResignationId(e.target.value);
                  setFetchError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
              />
            </div>
            <button
              className="rf-submit"
              onClick={handleFetch}
              disabled={loading || !resignationId.trim()}
              style={{ marginBottom: 0, flexShrink: 0 }}
            >
              {loading ? "Loading..." : "Load Form"}
            </button>
          </div>

          {fetchError && (
            <div style={{ marginTop: 12 }}>
              <BackendStatus error={fetchError} />
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              background: "#F8F9FA",
              border: "1px solid #EBEBEB",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 4,
              }}
            >
              Your Access
            </div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
              {currentRole === "rm" &&
                "You can accept or reject the resignation and add a comment."}
              {currentRole === "hod" &&
                "You can act after the Immediate Boss (RM) accepts. You can also add other departments."}
              {currentRole === "hr" &&
                "After HOD accepts, you manage IT, Library, and HR clearance sections."}
              {currentRole === "admin" &&
                "You handle Admin clearance — phone, ID card, and keys."}
              {currentRole === "finance" &&
                "You verify loan and advance clearance and provide final sign-off."}
            </div>
          </div>
        </div>
      </div>

      {form && (
        <HRClearance
          form={form}
          resignationId={Number(resignationId)}
          currentRole={currentRole}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [loggedInRole, setLoggedInRole] = useState(null);

  const handleLogin = (role) => setLoggedInRole(role);
  const handleLogout = () => setLoggedInRole(null);

  if (!loggedInRole) return <LoginPage onLogin={handleLogin} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F6F3",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .rf-card { background: #fff; border-radius: 20px; border: 1px solid #EBEBEB; overflow: hidden; margin-bottom: 1.5rem; }
        .rf-card-header { padding: 1.5rem 2rem; border-bottom: 1px solid #F0EDE8; display: flex; align-items: center; gap: 12px; }
        .rf-card-icon   { width: 36px; height: 36px; border-radius: 10px; background: #1A1A1A; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rf-card-title  { font-size: 15px; font-weight: 600; color: #1A1A1A; margin: 0; }
        .rf-card-sub    { font-size: 12px; color: #9A9693; margin: 2px 0 0; }
        .rf-card-body   { padding: 2rem; }
        .rf-grid        { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .rf-field       { display: flex; flex-direction: column; gap: 5px; }
        .rf-label       { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #888; }
        .rf-label span  { color: #E05C5C; margin-left: 2px; }
        .rf-input       { padding: 10px 13px; border-radius: 10px; border: 1.5px solid #E8E5E0; background: #FAFAF9; font-size: 14px; font-family: inherit; color: #1A1A1A; outline: none; transition: border-color .15s; width: 100%; }
        .rf-input::placeholder { color: #BDB9B2; }
        .rf-input:hover  { border-color: #CCC9C2; }
        .rf-input:focus  { border-color: #1A1A1A; background: #fff; box-shadow: 0 0 0 3px rgba(26,26,26,0.06); }
        .rf-input.rf-err { border-color: #E05C5C; background: #FFF8F8; }
        .rf-error-msg    { font-size: 11px; color: #E05C5C; font-weight: 500; }
        textarea.rf-input { min-height: 90px; resize: vertical; line-height: 1.6; }
        .rf-submit       { background: #1A1A1A; color: #fff; border: none; padding: 13px 28px; border-radius: 12px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: opacity .15s; }
        .rf-submit:hover { opacity: .85; }
        .rf-submit:disabled { opacity: .5; cursor: not-allowed; }
        .rf-divider      { border: none; border-top: 1px solid #F0EDE8; margin: 1.5rem 0; }
        .rf-preview-letterhead { border-bottom: 2px solid #1A1A1A; padding-bottom: 1.5rem; margin-bottom: 1.25rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .rf-preview-title { font-family: 'DM Serif Display', serif; font-size: 26px; color: #1A1A1A; margin: 0 0 4px; font-weight: 400; letter-spacing: -.5px; }
        .rf-preview-sub   { font-size: 12px; color: #9A9693; letter-spacing: .04em; text-transform: uppercase; }
        .rf-info-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 2rem; }
        .rf-info-box      { background: #FAFAF9; border: 1px solid #EBEBEB; border-radius: 12px; padding: 14px 16px; }
        .rf-info-box small { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #9A9693; font-weight: 600; }
        .rf-info-box p    { margin: 5px 0 0; font-size: 15px; font-weight: 600; color: #1A1A1A; }
        .rf-reason-block  { border-radius: 12px; border: 1px solid #EBEBEB; padding: 1.25rem; background: #FAFAF9; font-size: 14px; line-height: 1.75; color: #3A3A3A; }
        .rf-reason-label  { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; color: #9A9693; margin-bottom: 10px; }
        .rf-sig-row       { display: flex; justify-content: space-between; margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #F0EDE8; }
        .rf-sig           { text-align: center; }
        .rf-sig-line      { width: 160px; border-bottom: 1.5px solid #1A1A1A; margin: 0 auto 8px; }
        .rf-sig small     { font-size: 11px; color: #9A9693; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; }
        .rf-print-btn     { background: #fff; color: #1A1A1A; border: 1.5px solid #1A1A1A; padding: 11px 24px; border-radius: 12px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background .15s; display: inline-flex; align-items: center; gap: 7px; }
        .rf-print-btn:hover { background: #1A1A1A; color: #fff; }
        @media print {
          body * { visibility: hidden; }
          #resignation-preview, #resignation-preview * { visibility: visible; }
          #resignation-preview { position: fixed; top: 0; left: 0; width: 100%; border: none !important; border-radius: 0 !important; padding: 2.5rem !important; }
          #print-btn-row { display: none !important; }
        }
      `}</style>

      <TopNav currentRole={loggedInRole} onLogout={handleLogout} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
        {loggedInRole === "employee" ? (
          <EmployeeResignationForm />
        ) : (
          <ClearanceOnlyView currentRole={loggedInRole} />
        )}
      </div>
    </div>
  );
}
