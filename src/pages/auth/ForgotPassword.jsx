import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiKey, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
import loginIllustration from "../../assets/login_illustration.png";
import toast from "react-hot-toast";
import { getApiBaseUrl } from "../../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify & Reset
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const API = getApiBaseUrl();
      const response = await fetch(`${API}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || "Verification OTP sent!");
        setStep(2);
      } else {
        toast.error(data.error || "Failed to send OTP. Please verify your email.");
      }
    } catch (err) {
      toast.error("Unable to connect to the authentication service.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      toast.error("Please fill in all verification fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters long.");
      return;
    }

    setLoading(true);
    try {
      const API = getApiBaseUrl();
      const response = await fetch(`${API}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Password reset successful!");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        toast.error(data.error || "Verification failed. Please check the OTP.");
      }
    } catch (err) {
      toast.error("Unable to connect to the authentication service.");
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

            {/* Custom SVG Avatar indicating password lock/reset */}
            <div className="flex justify-center mb-6">
              <svg className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-700/80 shadow-sm" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="32" className="fill-slate-200 dark:fill-slate-800" />
                <path d="M32 14C24 14 24 24 24 28C24 32 26 36 32 36C38 36 40 32 40 28C40 24 40 14 32 14Z" fill="#F97316" />
                <circle cx="32" cy="25" r="8" fill="#FDBA74" />
                {/* Lock symbol overlay */}
                <rect x="24" y="38" width="16" height="12" rx="2" className="fill-blue-900 dark:fill-blue-600" />
                <path d="M28 38V34C28 31.8 29.8 30 32 30C34.2 30 36 31.8 36 34V38" stroke="currentColor" className="stroke-blue-900 dark:stroke-blue-400" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Title Section */}
            <div className="flex flex-col mb-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <div className="relative pb-1 select-none">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {step === 1 ? "Forgot Password" : "Verify & Reset"}
                </h2>
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-amber-500 rounded-full"></div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {step === 1
                  ? "Enter your registered email address below, and we'll send you a 6-digit OTP to reset your password."
                  : `Please enter the 6-digit OTP sent to ${email} and define your new password.`
                }
              </p>
            </div>

            {/* Step 1 Form: Request OTP */}
            {step === 1 ? (
              <form onSubmit={handleRequestOTP} className="space-y-4">
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

                {/* Submit Button */}
                <button type="submit" disabled={loading}
                  className="w-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-semibold py-3 mt-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 duration-200 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? <FiLoader className="animate-spin h-5 w-5 mr-2" /> : null}
                  {loading ? "Sending OTP..." : "Request Reset OTP"}
                </button>
              </form>
            ) : (
              /* Step 2 Form: Verify OTP & Reset Password */
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* OTP Input */}
                <div className="relative flex items-center">
                  <div className="absolute left-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white shadow-sm">
                    <FiKey className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="your otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    className="auth-input w-full rounded-full border border-slate-200 dark:border-slate-700/80 py-3 pl-14 pr-4 text-sm text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900/90 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-200/40 dark:focus:ring-amber-400/20 transition-all tracking-[4px] font-bold shadow-sm"
                  />
                </div>

                {/* New Password Input */}
                <div className="relative flex items-center">
                  <div className="absolute left-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white shadow-sm">
                    <FiLock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

                {/* Confirm Password Input */}
                <div className="relative flex items-center">
                  <div className="absolute left-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white shadow-sm">
                    <FiLock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="auth-input w-full rounded-full border border-slate-200 dark:border-slate-700/80 py-3 pl-14 pr-12 text-sm text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900/90 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-200/40 dark:focus:ring-amber-400/20 transition-all shadow-sm"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none transition-colors"
                  >
                    {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-semibold py-3 mt-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 duration-200 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? <FiLoader className="animate-spin h-5 w-5 mr-2" /> : null}
                  {loading ? "Resetting Password..." : "Verify & Reset Password"}
                </button>

                {/* Resend Helper Link */}
                <div className="text-center mt-3 text-xs">
                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    className="text-orange-500 dark:text-orange-400 font-bold hover:underline bg-transparent border-none outline-none p-0 cursor-pointer transition-colors"
                  >
                    Resend Verification OTP
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer navigation */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Back to{" "}
            <Link to="/login" className="text-orange-500 dark:text-orange-400 font-bold hover:underline transition-colors">
              Login
            </Link>
          </div>
        </div>

        {/* Right Side: Illustration (Cream Background in Light, Rich Slate in Dark) */}
        <div className="hidden md:flex md:w-1/2 bg-[#FDF1DB] dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/95 dark:to-amber-950/20 items-center justify-center p-8 lg:p-12 select-none border-l border-slate-100 dark:border-slate-800/80 transition-colors">
          <img
            src={loginIllustration}
            alt="HRMS Password Reset Illustration"
            className="max-h-[380px] w-auto object-contain drop-shadow-md rounded-[32px] dark:drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] dark:brightness-95 dark:contrast-105 dark:ring-1 dark:ring-slate-700/50 transition-all"
          />
        </div>

      </div>
    </div>
  );
}
