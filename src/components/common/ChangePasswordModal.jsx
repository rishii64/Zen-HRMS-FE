import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  FiLock,
  FiKey,
  FiEye,
  FiEyeOff,
  FiX,
  FiCheckCircle,
  FiLoader,
  FiShield,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/axios";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Reset form when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setErrorMsg("");
      setLoading(false);
    }
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen && typeof document !== "undefined") {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const isMinLength = newPassword.length >= 6;
  const isDifferent = Boolean(currentPassword && newPassword && currentPassword !== newPassword);
  const isMatching = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!currentPassword.trim()) {
      setErrorMsg("Please enter your current password.");
      return;
    }

    if (!newPassword) {
      setErrorMsg("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg("New password must be different from your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/change-password", {
        currentPassword,
        newPassword,
      });

      if (response.data && response.data.success) {
        toast.success(response.data.message || "Password updated successfully!");
        onClose();
      } else {
        setErrorMsg(response.data?.error || "Failed to update password.");
      }
    } catch (err) {
      console.error("Change password error:", err);
      const serverMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to change password. Please verify your current password.";
      setErrorMsg(serverMsg);
      toast.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    onClose();
    navigate("/forgot-password");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div className="relative w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FiShield className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="change-password-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Change Password
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update your account password
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Current Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPasswordClick}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FiLock className="w-4 h-4" />
              </div>
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="Enter current password"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
              >
                {showCurrent ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FiKey className="w-4 h-4" />
              </div>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showNew ? "Hide new password" : "Show new password"}
              >
                {showNew ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Validation Hints */}
            {newPassword.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                    isMinLength
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <span className="text-xs">{isMinLength ? "✓" : "•"}</span> At least 6 characters
                </span>

                {currentPassword && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                      isDifferent
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    }`}
                  >
                    <span className="text-xs">{isDifferent ? "✓" : "!"}</span> Distinct from current
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Confirm New Password Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FiCheckCircle className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}
              >
                {showConfirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>

            {/* Match Indicator */}
            {confirmPassword.length > 0 && (
              <p
                className={`mt-1.5 text-[11px] font-medium flex items-center gap-1 ${
                  isMatching
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                <span>{isMatching ? "✓" : "!"}</span>
                {isMatching ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword || !isMatching}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <FiLoader className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? "Updating..." : "Update Password"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
