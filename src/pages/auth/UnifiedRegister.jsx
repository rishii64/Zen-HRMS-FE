import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiHash, FiLoader } from "react-icons/fi";
import { LuShieldAlert } from "react-icons/lu";
import loginIllustration from "../../assets/login_illustration.png";
import toast from 'react-hot-toast';
import { getApiBaseUrl } from "../../api/axios";

export default function UnifiedRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("hr");
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // const [error, setError] = useState("");
  // const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role || !employeeId) {
      toast.error("Please fill in all required fields (including Employee ID).");
      return;
    }

    setLoading(true);
    // setError("");
    // setSuccess("");

    try {
      const API = getApiBaseUrl();
      const response = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          employee_id: employeeId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Registration successful! Redirecting to login...");
        navigate("/login");
      } else {
        toast.error(data.error || "Registration failed. Please check your details.");
        // setError(data.error || "Registration failed. Please check your details.");
      }
    } catch (err) {
      toast.error("Unable to connect to the authentication service. Is the backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-100 to-amber-50/50 dark:from-[#0b1329] dark:via-[#0f172a] dark:to-slate-950 p-4 md:p-8 transition-colors">
      {/* Outer Card Container */}
      <div className="flex flex-col md:flex-row w-full max-w-4xl bg-white dark:bg-slate-900/90 rounded-[32px] shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border border-slate-200/50 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Left Side: Form Container */}
        <div className="auth-honeycomb w-full md:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-between transition-colors">
          <div className="w-full">
            {/* Header Logo */}
            <div className="text-center mb-4">
              <h1 className="text-3xl font-extrabold tracking-wider text-orange-500 select-none">HRMS</h1>
            </div>

            {/* Custom SVG Avatar with Registration plus symbol */}
            <div className="flex justify-center mb-6">
              <svg className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-700/80 shadow-sm" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="32" className="fill-slate-200 dark:fill-slate-800" />
                <path d="M32 14C24 14 24 24 24 28C24 32 26 36 32 36C38 36 40 32 40 28C40 24 40 14 32 14Z" fill="#F97316" />
                <circle cx="32" cy="25" r="8" fill="#FDBA74" />
                <path d="M26 21C26 21 28 17 32 17C36 17 38 21 38 21C38 21 37 19 32 19C27 19 26 21 26 21Z" fill="#EA580C" />
                <path d="M16 48C16 42 22 38 32 38C42 38 48 42 48 48V52H16V48Z" className="fill-blue-900 dark:fill-blue-600" />
                {/* Plus badge on registration */}
                <circle cx="46" cy="46" r="10" fill="#22C55E" stroke="currentColor" className="stroke-white dark:stroke-slate-900" strokeWidth="2" />
                <path d="M46 42V50M42 46H50" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Title & Role Tabs Group */}
            <div className="flex sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="relative pb-1 select-none">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Register</h2>
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-amber-500 rounded-full"></div>
              </div>
              <div className="text-xs flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-700/50">
                <LuShieldAlert /> HR registration only
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div className="relative flex items-center">
                <div className="absolute left-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white shadow-sm">
                  <FiUser className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  className="auth-input w-full rounded-full border border-slate-200 dark:border-slate-700/80 py-3 pl-14 pr-4 text-sm text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900/90 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-200/40 dark:focus:ring-amber-400/20 transition-all shadow-sm"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Email Input */}
              <div className="relative flex items-center">
                <div className="absolute left-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white shadow-sm">
                  <FiMail className="h-4.5 w-4.5" />
                </div>
                <input
                  type="email"
                  className="auth-input w-full rounded-full border border-slate-200 dark:border-slate-700/80 py-3 pl-14 pr-4 text-sm text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900/90 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-200/40 dark:focus:ring-amber-400/20 transition-all shadow-sm"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Input */}
              <div className="relative flex items-center">
                <div className="absolute left-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white shadow-sm">
                  <FiLock className="h-4.5 w-4.5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input w-full rounded-full border border-slate-200 dark:border-slate-700/80 py-3 pl-14 pr-12 text-sm text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900/90 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-200/40 dark:focus:ring-amber-400/20 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none transition-colors"
                >
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>

              {/* Employee ID (Required for all roles) */}
              <div className="relative flex items-center">
                <div className="absolute left-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white shadow-sm">
                  <FiHash className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  className="auth-input w-full rounded-full border border-slate-200 dark:border-slate-700/80 py-3 pl-14 pr-4 text-sm text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900/90 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-200/40 dark:focus:ring-amber-400/20 transition-all shadow-sm"
                  placeholder="Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-semibold py-3 mt-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 duration-200 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? <FiLoader className="animate-spin h-5 w-5 mr-2" /> : null}
                {loading ? "Registering..." : "Create Account"}
              </button>
            </form>
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have portal access?{" "}
            <Link to="/login" className="text-orange-500 dark:text-orange-400 font-bold hover:underline transition-colors">
              Login Here
            </Link>
          </div>
        </div>

        {/* Right Side: Illustration (Cream Background in Light, Rich Slate in Dark) */}
        <div className="hidden md:flex md:w-1/2 bg-[#FDF1DB] dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/95 dark:to-amber-950/20 items-center justify-center p-8 lg:p-12 select-none border-l border-slate-100 dark:border-slate-800/80 transition-colors">
          <img
            src={loginIllustration}
            alt="HRMS Team Illustration"
            className="max-h-[380px] w-auto object-contain drop-shadow-md rounded-[32px] dark:drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] dark:brightness-95 dark:contrast-105 dark:ring-1 dark:ring-slate-700/50 transition-all"
          />
        </div>
      </div>
    </div>
  );
}
