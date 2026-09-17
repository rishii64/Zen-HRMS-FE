import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiHash, FiLock, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
import loginIllustration from "../../assets/login_illustration.png";
import toast from 'react-hot-toast';
import { getApiBaseUrl } from "../../api/axios";

export default function UnifiedLogin() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [loading, setLoading] = useState(false);
  // const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!employeeId || !password || !role) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    // setError("");

    try {
      const API = getApiBaseUrl();
      const response = await fetch(`${API}/login`, {
          method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, password, role }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Login successful");
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.user.role);
        localStorage.setItem("userName", data.user.name);
        localStorage.setItem("email", data.user.email);
        localStorage.setItem("userId", data.user.id);
        if (data.user.employee_id) {
          // localStorage.setItem("employeeCode", data.user.employee_id);
          localStorage.setItem("empId", data.user.employee_id);
        }

        setTimeout(() => {
          setLoading(false);
          // Redirect based on role
          if (data.user.role === "hr") {
            navigate("/admin/dashboard");
          } else if (data.user.role === "employee") {
            navigate("/employee/dashboard");
          } else if (data.user.role === "accounts" || data.user.role === "payroll") {
            navigate("/accounts/dashboard");
          } else if (data.user.role === "hod") {
            navigate("/hod/dashboard");
          } else {
            toast.error("Invalid role");
            navigate("/");
          }
        }, 1000);
      } else {
        toast.error(data.error || "Login failed. Please check your credentials.");
        // setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      toast.error("Unable to connect to the authentication service. Is the backend running?");
      // setError("Unable to connect to the authentication service. Is the backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const honeycombStyle = {
    backgroundColor: "#ffffff",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath fill='none' stroke='%23f1f5f9' stroke-width='1.5' d='M13.9 0L0 8v16l13.9 8L27.8 24V8L13.9 0z M0 33L13.9 41L27.8 33 M13.9 41v8'/%3E%3C/svg%3E")`,
    backgroundSize: "28px 49px",
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-100 to-amber-50/50 p-4 md:p-8">
      {/* Outer Card Container */}
      <div className="flex flex-col md:flex-row w-full max-w-4xl bg-white rounded-[32px] shadow-2xl border border-slate-200/50 overflow-hidden">
        {/* Left Side: Form Container */}
        <div style={honeycombStyle} className="w-full md:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-between">
          <div className="w-full">
            {/* Header Logo */}
            <div className="text-center mb-4">
              <h1 className="text-3xl font-extrabold tracking-wider text-orange-500 select-none">HRMS</h1>
            </div>

            {/* Custom SVG Avatar */}
            <div className="flex justify-center mb-6">
              <svg className="w-16 h-16 rounded-full border border-slate-200 shadow-sm" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="32" fill="#E2E8F0" />
                <path d="M32 14C24 14 24 24 24 28C24 32 26 36 32 36C38 36 40 32 40 28C40 24 40 14 32 14Z" fill="#F97316" />
                <circle cx="32" cy="25" r="8" fill="#FDBA74" />
                <path d="M26 21C26 21 28 17 32 17C36 17 38 21 38 21C38 21 37 19 32 19C27 19 26 21 26 21Z" fill="#EA580C" />
                <path d="M16 48C16 42 22 38 32 38C42 38 48 42 48 48V52H16V48Z" fill="#1E3A8A" />
                <path d="M32 38L28 44H36L32 38Z" fill="#FDBA74" />
                <path d="M28 38L32 48L36 38L32 41L28 38Z" fill="#FFFFFF" />
                <path d="M31 43L32 48L33 43V52H31V43Z" fill="#2563EB" />
              </svg>
            </div>

            {/* Title & Role Tabs Group */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="relative pb-1 select-none">
                <h2 className="text-xl font-bold text-slate-800">Sign In</h2>
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-amber-500 rounded-full"></div>
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-500">
                <span className="text-slate-400 font-medium">Login As:</span>
                {[
                  { id: "employee", label: "Employee" },
                  { id: "hr", label: "HR" },
                  { id: "accounts", label: "Finance" },
                  { id: "hod", label: "HOD" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`transition-all duration-200 pb-0.5 border-b-2 ${role === r.id
                      ? "text-orange-500 border-orange-500 font-bold"
                      : "text-slate-400 border-transparent hover:text-slate-600 font-medium"
                      }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {/* {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
                {error}
              </div>
            )} */}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Employee ID Input */}
              <div className="relative flex items-center">
                <div className="absolute left-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white shadow-sm">
                  <FiHash className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  className="w-full rounded-full border border-slate-200 py-3 pl-14 pr-4 text-sm text-slate-700 bg-white placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200/40 transition-all shadow-sm"
                  placeholder="Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                />
              </div>

              {/* Password Input */}
              <div className="relative flex items-center">
                <div className="absolute left-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white shadow-sm">
                  <FiLock className="h-4.5 w-4.5" />
                </div>
                <input type={showPassword ? "text" : "password"}
                  className="w-full rounded-full border border-slate-200 py-3 pl-14 pr-12 text-sm text-slate-700 bg-white placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200/40 transition-all shadow-sm"
                  placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors">
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>

              {/* Submit Button */}
              <button type="submit" disabled={loading} className="w-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-semibold py-3 mt-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 duration-200 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none">
                {loading ? <FiLoader className="animate-spin h-5 w-5 mr-2" /> : null}
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>

          {/* Footer & Forgot Password */}
          <div className="mt-8 space-y-4">
            <div className="flex justify-center">
              <Link
                to="/forgot-password"
                className="px-6 py-1.5 rounded-full border border-amber-300 bg-amber-50/20 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors shadow-sm select-none"
              >
                Forgot Password ?
              </Link>
            </div>
            <div className="text-center text-xs text-slate-500">
              Don't have portal credentials?{" "}
              <Link to="/register" className="text-orange-500 font-bold hover:underline">
                Register Here
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Illustration (Cream Background) */}
        <div className="hidden md:flex md:w-1/2 bg-[#FDF1DB] items-center justify-center p-8 lg:p-12 select-none border-l border-slate-100">
          <img
            src={loginIllustration}
            alt="HRMS Team Illustration"
            className="max-h-[380px] w-auto object-contain drop-shadow-md rounded-[32px]"
          />
        </div>
      </div>
    </div>
  );
}
