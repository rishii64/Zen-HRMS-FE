import React, { useState, useEffect, useMemo } from "react";
import {
  LuLandmark,
  LuHandCoins,
  LuCalculator,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuCalendar,
  LuArrowRight,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuFilter,
  LuFileText,
  LuCreditCard,
  LuPercent,
  LuTrendingUp,
  LuShieldCheck,
  LuCircleAlert,
  LuReceipt,
  LuCheck,
  LuX,
  LuChevronRight,
  LuDollarSign,
  LuUserCheck,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { getAuthRole, getAuthEmployeeCode } from "../../utils/auth";
import SequentialApprovalTimeline from "../../components/common/SequentialApprovalTimeline";

export default function LoanAdvanceDesk() {
  const currentRole = (getAuthRole() || "").toLowerCase().trim();
  const currentEmpId = getAuthEmployeeCode();
  const isFinanceOrHR = [
    "hr",
    "admin",
    "finance",
    "accounts",
    "payroll",
    "management",
    "ceo",
    "coo",
    "hrmanager",
  ].includes(currentRole);

  const [activeTab, setActiveTab] = useState(isFinanceOrHR ? "company_desk" : "my_loans");
  const [loading, setLoading] = useState(false);

  // Data states
  const [myLoans, setMyLoans] = useState([]);
  const [mySummary, setMySummary] = useState(null);
  const [allLoans, setAllLoans] = useState([]);
  const [companySummary, setCompanySummary] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayRemarks, setRepayRemarks] = useState("");
  const [disburseForm, setDisburseForm] = useState({
    disbursement_mode: "Bank Transfer",
    disbursement_ref: "",
    disbursement_date: new Date().toISOString().split("T")[0],
    comments: "",
  });

  // Simulator / Application Form state
  const [simType, setSimType] = useState("SALARY_ADVANCE"); // "SALARY_ADVANCE" | "LOAN"
  const [simAmount, setSimAmount] = useState(simType === "SALARY_ADVANCE" ? 30000 : 200000);
  const [simTenure, setSimTenure] = useState(simType === "SALARY_ADVANCE" ? 3 : 12);
  const [simInterestRate, setSimInterestRate] = useState(8.5); // Configurable Annual Interest Rate for Loans
  const [simPurpose, setSimPurpose] = useState("Medical Emergency");
  const [simReason, setSimReason] = useState("");
  const [simStartMonth, setSimStartMonth] = useState("");
  const [simPreview, setSimPreview] = useState(null);

  // Initial next month for repayment start
  useEffect(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSimStartMonth(mStr);
  }, []);

  // Fetch my loans
  const fetchMyLoans = async () => {
    try {
      setLoading(true);
      const res = await api.get("/loans/my");
      if (res.data?.success) {
        setMyLoans(res.data.loans || []);
        setMySummary(res.data.summary || null);
      }
    } catch (err) {
      console.warn("Could not fetch my loans:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch company desk loans
  const fetchAllLoans = async () => {
    try {
      setLoading(true);
      const res = await api.get("/loans", {
        params: {
          type: typeFilter,
          status: statusFilter,
          search: searchTerm,
        },
      });
      if (res.data?.success) {
        setAllLoans(res.data.loans || []);
        setCompanySummary(res.data.summary || null);
      }
    } catch (err) {
      console.warn("Could not fetch all loans:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "my_loans") {
      fetchMyLoans();
    } else if (activeTab === "company_desk") {
      fetchAllLoans();
    }
  }, [activeTab, typeFilter, statusFilter]);

  // Run live simulation calculation
  useEffect(() => {
    const calcSimulation = async () => {
      try {
        const res = await api.get("/loans/calculate-emi", {
          params: {
            amount: simAmount,
            tenure_months: simTenure,
            type: simType,
            interest_rate: simType === "SALARY_ADVANCE" ? 0 : simInterestRate,
            start_month: simStartMonth,
          },
        });
        if (res.data?.success) {
          setSimPreview(res.data.preview);
        }
      } catch (err) {
        console.warn("Simulator calculation warning:", err.message);
      }
    };
    calcSimulation();
  }, [simType, simAmount, simTenure, simInterestRate, simStartMonth]);

  // Adjust defaults when switching between SALARY_ADVANCE and LOAN in simulator
  const handleSimTypeChange = (type) => {
    setSimType(type);
    if (type === "SALARY_ADVANCE") {
      setSimAmount(30000);
      setSimTenure(3);
    } else {
      setSimAmount(200000);
      setSimTenure(12);
    }
  };

  // Submit Loan Application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post("/loans/apply", {
        type: simType,
        principal_amount: simAmount,
        tenure_months: simTenure,
        interest_rate: simType === "SALARY_ADVANCE" ? 0 : simInterestRate,
        purpose: simPurpose,
        reason_details: simReason,
        repayment_start_month: simStartMonth,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Application submitted successfully!");
        setShowApplyModal(false);
        setSimReason("");
        fetchMyLoans();
        if (isFinanceOrHR) fetchAllLoans();
        setActiveTab("my_loans");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  // Open single loan details
  const handleOpenDetails = async (loan) => {
    try {
      const res = await api.get(`/loans/${loan.id}`);
      if (res.data?.success) {
        setSelectedLoan(res.data.loan);
        setShowDetailsModal(true);
      }
    } catch (err) {
      toast.error("Failed to load loan details");
    }
  };

  // Disburse Loan Action (Finance Desk)
  const handleDisburseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;
    try {
      setLoading(true);
      const res = await api.put(`/loans/${selectedLoan.id}/disburse`, disburseForm);
      if (res.data?.success) {
        toast.success(res.data.message || "Loan successfully disbursed!");
        setShowDisburseModal(false);
        handleOpenDetails(selectedLoan);
        fetchAllLoans();
        fetchMyLoans();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Disbursement failed");
    } finally {
      setLoading(false);
    }
  };

  // Record Manual Repayment / Prepayment
  const handleRecordRepayment = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;
    const amt = parseFloat(repayAmount);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid repayment amount");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post(`/loans/${selectedLoan.id}/repay`, {
        amount: amt,
        remarks: repayRemarks || `Manual pre-payment of ₹${amt}`,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Repayment recorded!");
        setShowRepayModal(false);
        setRepayAmount("");
        setRepayRemarks("");
        handleOpenDetails(selectedLoan);
        fetchMyLoans();
        if (isFinanceOrHR) fetchAllLoans();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Repayment recording failed");
    } finally {
      setLoading(false);
    }
  };

  // Cancel Loan Application
  const handleCancelApplication = async (loanId) => {
    if (!window.confirm("Are you sure you want to cancel this application?")) return;
    try {
      setLoading(true);
      const res = await api.put(`/loans/${loanId}/cancel`);
      if (res.data?.success) {
        toast.success("Application cancelled");
        fetchMyLoans();
        if (isFinanceOrHR) fetchAllLoans();
        if (showDetailsModal) setShowDetailsModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel");
    } finally {
      setLoading(false);
    }
  };

  // Status Badge Component
  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
      case "DISBURSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <LuCircleCheck className="w-3.5 h-3.5 text-emerald-600" /> Active / Repaying
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <LuShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Sanctioned (Awaiting Disbursement)
          </span>
        );
      case "PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <LuClock className="w-3.5 h-3.5 text-amber-600" /> Approval In Progress
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <LuCircleCheck className="w-3.5 h-3.5 text-purple-600" /> Fully Settled
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <LuCircleX className="w-3.5 h-3.5 text-rose-600" /> Rejected
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <LuX className="w-3.5 h-3.5 text-gray-500" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
              <LuLandmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Loans & Salary Advance Management
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Automated reducing-balance EMI calculations, sequential sanction routing & payroll deductions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowApplyModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-sm shadow-emerald-200 active:scale-[0.98]"
            >
              <LuPlus className="w-4 h-4" />
              <span>Apply for Loan / Advance</span>
            </button>

            <button
              onClick={() => {
                if (activeTab === "my_loans") fetchMyLoans();
                else fetchAllLoans();
              }}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh"
            >
              <LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Top Summary KPI Cards */}
        {activeTab === "my_loans" && mySummary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Availed</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{Number(mySummary.total_availed || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">{mySummary.total_applications || 0} Total Requests</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <LuHandCoins className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Balance</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  ₹{Number(mySummary.active_outstanding || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">{mySummary.active_count || 0} Active Loans</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <LuCreditCard className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Payroll EMI</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{Number(mySummary.monthly_emi_total || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">Auto-deducted next salary</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <LuCalendar className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed / Settled</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{mySummary.completed_count || 0}</p>
                <p className="text-xs text-slate-500 mt-1">100% Repaid</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <LuCircleCheck className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "company_desk" && companySummary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Disbursed</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{Number(companySummary.total_disbursed || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">Company-wide capital</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <LuLandmark className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Outstanding</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  ₹{Number(companySummary.total_outstanding || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">Risk Exposure Balance</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <LuTrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Recovery</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  ₹{Number(companySummary.total_monthly_recovery || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">Payroll Deductions</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <LuReceipt className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Sanction</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{companySummary.pending_sanctions || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Requires review</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <LuClock className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {/* Tab Selector & Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab("my_loans")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === "my_loans"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              My Loans & Advances
            </button>

            {isFinanceOrHR && (
              <button
                onClick={() => setActiveTab("company_desk")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === "company_desk"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                HR & Finance Sanction Desk
              </button>
            )}

            <button
              onClick={() => setActiveTab("simulator")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "simulator"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LuCalculator className="w-4 h-4 text-emerald-600" />
              Interactive EMI Calculator
            </button>
          </div>

          {activeTab !== "simulator" && (
            <div className="flex flex-wrap items-center gap-3 px-2">
              <div className="relative">
                <LuSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID, name, purpose..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-60"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="ALL">All Types</option>
                <option value="SALARY_ADVANCE">Salary Advance</option>
                <option value="LOAN">Company Loan</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Sanctioned (Ready to Disburse)</option>
                <option value="ACTIVE">Active / Repaying</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: My Loans & Advances */}
        {activeTab === "my_loans" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {myLoans.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <LuHandCoins className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No active or past loans found</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  You do not have any salary advance or loan applications yet. You can simulate and apply for 0% salary advances or company personal loans anytime.
                </p>
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition"
                >
                  <LuPlus className="w-4 h-4" /> Apply for Salary Advance / Loan
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4">Application Details</th>
                      <th className="py-3.5 px-4">Type & Interest</th>
                      <th className="py-3.5 px-4">Principal / Total</th>
                      <th className="py-3.5 px-4">Monthly EMI</th>
                      <th className="py-3.5 px-4">Repayment Progress</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {myLoans.map((loan) => {
                      const total = parseFloat(loan.total_repayable) || 0;
                      const paid = parseFloat(loan.paid_amount) || 0;
                      const remaining = parseFloat(loan.remaining_balance) || 0;
                      const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{loan.application_number}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{loan.purpose}</div>
                            <div className="text-[11px] text-slate-400">
                              Applied on {new Date(loan.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                loan.type === "SALARY_ADVANCE"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              }`}
                            >
                              {loan.type === "SALARY_ADVANCE" ? "Salary Advance" : "Company Loan"}
                            </span>
                            <div className="text-xs text-slate-500 mt-1">
                              {loan.type === "SALARY_ADVANCE" ? "0.0% (Zero Interest)" : `${loan.interest_rate}% p.a. (Reducing)`}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              ₹{Number(loan.principal_amount).toLocaleString("en-IN")}
                            </div>
                            <div className="text-xs text-slate-500">
                              Total: ₹{Number(loan.total_repayable).toLocaleString("en-IN")}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-emerald-600">
                              ₹{Number(loan.monthly_emi).toLocaleString("en-IN")} / mo
                            </div>
                            <div className="text-xs text-slate-500">
                              {loan.tenure_months} Months ({loan.paid_installments || 0}/{loan.total_installments} paid)
                            </div>
                          </td>
                          <td className="py-3.5 px-4 w-44">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-600 font-medium">₹{paid.toLocaleString("en-IN")}</span>
                              <span className="text-slate-400">{progressPct}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-amber-600 mt-1">
                              Rem: ₹{remaining.toLocaleString("en-IN")}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">{getStatusBadge(loan.status)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenDetails(loan)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                              >
                                View Schedule
                              </button>
                              {loan.status === "PENDING_APPROVAL" && (
                                <button
                                  onClick={() => handleCancelApplication(loan.id)}
                                  className="px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Cancel application"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: HR & Finance Desk (All Applications) */}
        {activeTab === "company_desk" && isFinanceOrHR && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Applicant Employee</th>
                    <th className="py-3.5 px-4">Application No.</th>
                    <th className="py-3.5 px-4">Type & Tenure</th>
                    <th className="py-3.5 px-4">Principal Amount</th>
                    <th className="py-3.5 px-4">Monthly EMI</th>
                    <th className="py-3.5 px-4">Outstanding Balance</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Desk Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {allLoans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No loan records matching the current criteria.
                      </td>
                    </tr>
                  ) : (
                    allLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{loan.employee_name}</div>
                          <div className="text-xs text-slate-500">
                            {loan.employee_id} • {loan.department || "General"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-medium text-slate-700">
                          {loan.application_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              loan.type === "SALARY_ADVANCE"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            {loan.type === "SALARY_ADVANCE" ? "Advance (0%)" : "Loan (8.5%)"}
                          </span>
                          <div className="text-xs text-slate-500 mt-0.5">{loan.tenure_months} Months</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹{Number(loan.principal_amount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-emerald-600">
                          ₹{Number(loan.monthly_emi).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-amber-600">
                          ₹{Number(loan.remaining_balance).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(loan.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenDetails(loan)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                            >
                              Inspect
                            </button>

                            {loan.status === "APPROVED" && (
                              <button
                                onClick={() => {
                                  setSelectedLoan(loan);
                                  setShowDisburseModal(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                              >
                                Disburse
                              </button>
                            )}

                            {(loan.status === "ACTIVE" || loan.status === "DISBURSED") && (
                              <button
                                onClick={() => {
                                  setSelectedLoan(loan);
                                  setRepayAmount(String(loan.remaining_balance));
                                  setShowRepayModal(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition"
                                title="Record off-cycle settlement"
                              >
                                Repay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Interactive EMI Calculator / Simulator */}
        {activeTab === "simulator" && simPreview && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Controls */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <LuCalculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">EMI & Amortization Simulator</h3>
                  <p className="text-xs text-slate-500">Fine-tune borrowing amount, tenure and simulate deductions</p>
                </div>
              </div>

              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Borrowing Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleSimTypeChange("SALARY_ADVANCE")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition ${
                      simType === "SALARY_ADVANCE"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Salary Advance (0% Int.)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimTypeChange("LOAN")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition ${
                      simType === "LOAN"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Company Loan ({simInterestRate}% p.a.)
                  </button>
                </div>
              </div>

              {/* Principal Amount Slider & Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Principal Amount (₹)
                  </label>
                  <span className="text-base font-extrabold text-slate-900">
                    ₹{Number(simAmount).toLocaleString("en-IN")}
                  </span>
                </div>
                <input
                  type="range"
                  min={simType === "SALARY_ADVANCE" ? 5000 : 100000}
                  max={simType === "SALARY_ADVANCE" ? 100000 : 1000000}
                  step={simType === "SALARY_ADVANCE" ? 5000 : 25000}
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>₹{simType === "SALARY_ADVANCE" ? "5,000" : "1,00,000"}</span>
                  <span>₹{simType === "SALARY_ADVANCE" ? "1,00,000 (Max)" : "10,00,000 (Max)"}</span>
                </div>
              </div>

              {/* Tenure Slider & Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Tenure (Months)
                  </label>
                  <span className="text-base font-extrabold text-slate-900">{simTenure} Months</span>
                </div>
                <input
                  type="range"
                  min={simType === "SALARY_ADVANCE" ? 1 : 6}
                  max={simType === "SALARY_ADVANCE" ? 6 : 60}
                  step={1}
                  value={simTenure}
                  onChange={(e) => setSimTenure(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>{simType === "SALARY_ADVANCE" ? "1 Mo" : "6 Mos"}</span>
                  <span>{simType === "SALARY_ADVANCE" ? "6 Mos (Max)" : "60 Mos (Max)"}</span>
                </div>
              </div>

              {/* Manual Configured Annual Interest Rate Field */}
              {simType === "LOAN" ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <LuPercent className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Configured Annual Interest Rate (% p.a.)</span>
                    </label>
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      Reducing Balance
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="30"
                      value={simInterestRate}
                      onChange={(e) => setSimInterestRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 pr-12 text-sm font-extrabold text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-inner"
                      placeholder="e.g. 8.5"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      % p.a.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
                    {[7.0, 7.5, 8.0, 8.5, 9.0, 10.0, 12.0].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setSimInterestRate(rate)}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition ${
                          simInterestRate === rate
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-blue-900">0% Statutory Advance</span>
                    <p className="text-blue-700 text-[11px]">Salary advance is recovered at zero interest.</p>
                  </div>
                  <span className="font-extrabold text-blue-700 text-sm">0.0% p.a.</span>
                </div>
              )}

              {/* Start Month */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Repayment Start Month
                </label>
                <input
                  type="month"
                  value={simStartMonth}
                  onChange={(e) => setSimStartMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 1-Click Apply Button */}
              <button
                onClick={() => setShowApplyModal(true)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-sm shadow-emerald-200 flex items-center justify-center gap-2"
              >
                <span>Apply with this Configured Plan</span>
                <LuArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Live Calculation Results & Schedule Table */}
            <div className="lg:col-span-7 space-y-6">
              {/* Output Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm">
                  <p className="text-xs uppercase font-medium text-emerald-100">Monthly EMI Deduction</p>
                  <p className="text-3xl font-extrabold mt-1">
                    ₹{Number(simPreview.monthly_emi).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-emerald-200 mt-1">Deducted from salary</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs uppercase font-bold text-slate-400">Total Interest Payable</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ₹{Number(simPreview.total_interest).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {simPreview.interest_rate > 0 ? `${simPreview.interest_rate}% Reducing` : "0% Interest Advance"}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs uppercase font-bold text-slate-400">Total Amount Repayable</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ₹{Number(simPreview.total_repayable).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Principal + Interest</p>
                </div>
              </div>

              {/* Amortization Schedule Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">Month-by-Month Amortization Schedule</h4>
                  <span className="text-xs text-slate-500">{simPreview.schedule.length} Installments</span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 sticky top-0 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Month</th>
                        <th className="py-2.5 px-3">Opening (₹)</th>
                        <th className="py-2.5 px-3 text-emerald-700">EMI (₹)</th>
                        <th className="py-2.5 px-3">Principal (₹)</th>
                        <th className="py-2.5 px-3">Interest (₹)</th>
                        <th className="py-2.5 px-3">Closing (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {simPreview.schedule.map((row) => (
                        <tr key={row.installment_no} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-mono font-medium text-slate-500">{row.installment_no}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{row.month_label}</td>
                          <td className="py-2 px-3">{Number(row.opening_balance).toLocaleString("en-IN")}</td>
                          <td className="py-2 px-3 font-bold text-emerald-600">
                            {Number(row.emi).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 px-3">{Number(row.principal_component).toLocaleString("en-IN")}</td>
                          <td className="py-2 px-3 text-slate-500">{Number(row.interest_component).toLocaleString("en-IN")}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {Number(row.closing_balance).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Apply for Loan / Advance */}
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <LuHandCoins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Apply for Loan / Salary Advance</h3>
                    <p className="text-xs text-slate-500">Subject to policy limits & sequential approval</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Application Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSimTypeChange("SALARY_ADVANCE")}
                      className={`p-3 rounded-xl border text-left transition ${
                        simType === "SALARY_ADVANCE"
                          ? "border-emerald-500 bg-emerald-50/50 text-emerald-900"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="font-bold text-sm">Salary Advance</div>
                      <div className="text-xs text-slate-500 mt-0.5">0% Interest • 1-6 Mos • Max ₹1,00,000</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimTypeChange("LOAN")}
                      className={`p-3 rounded-xl border text-left transition ${
                        simType === "LOAN"
                          ? "border-emerald-500 bg-emerald-50/50 text-emerald-900"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="font-bold text-sm">Company Personal Loan</div>
                      <div className="text-xs text-slate-500 mt-0.5">{simInterestRate}% p.a. • 6-60 Mos • ₹1L - ₹10L</div>
                    </button>
                  </div>
                </div>

                {/* Amount, Tenure & Configured Interest Rate Inputs */}
                <div className={`grid gap-3 ${simType === "LOAN" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min={simType === "SALARY_ADVANCE" ? 1000 : 100000}
                      max={simType === "SALARY_ADVANCE" ? 100000 : 1000000}
                      value={simAmount}
                      onChange={(e) => setSimAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Tenure (Months)
                    </label>
                    <input
                      type="number"
                      required
                      min={simType === "SALARY_ADVANCE" ? 1 : 6}
                      max={simType === "SALARY_ADVANCE" ? 6 : 60}
                      value={simTenure}
                      onChange={(e) => setSimTenure(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {simType === "LOAN" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Interest Rate (% p.a.)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="30"
                          required
                          value={simInterestRate}
                          onChange={(e) => setSimInterestRate(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 pr-8 text-sm font-bold text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live EMI Badge in modal */}
                {simPreview && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500">Calculated Monthly EMI:</span>
                      <span className="ml-2 font-extrabold text-emerald-700 text-base">
                        ₹{Number(simPreview.monthly_emi).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Total Payable: <strong className="text-slate-800">₹{Number(simPreview.total_repayable).toLocaleString("en-IN")}</strong>
                    </div>
                  </div>
                )}

                {/* Purpose & Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Purpose
                    </label>
                    <select
                      value={simPurpose}
                      onChange={(e) => setSimPurpose(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="Medical Emergency">Medical Emergency</option>
                      <option value="Education / Tuition Fees">Education / Tuition Fees</option>
                      <option value="Home Renovation / Repair">Home Renovation / Repair</option>
                      <option value="Family Function / Wedding">Family Function / Wedding</option>
                      <option value="Relocation / Rental Deposit">Relocation / Rental Deposit</option>
                      <option value="Vehicle Purchase / Repair">Vehicle Purchase / Repair</option>
                      <option value="Personal Need">Personal Need</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Repayment Start Month
                    </label>
                    <input
                      type="month"
                      required
                      value={simStartMonth}
                      onChange={(e) => setSimStartMonth(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Justification / Details
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide brief details regarding the requirement..."
                    value={simReason}
                    onChange={(e) => setSimReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Statutory Agreement Notice */}
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <LuCircleAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    By submitting, I authorize monthly payroll deduction of ₹
                    {simPreview ? Number(simPreview.monthly_emi).toLocaleString("en-IN") : "0"} starting from{" "}
                    <strong>{simStartMonth}</strong> until full recovery as per company guidelines.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition shadow-sm shadow-emerald-200"
                  >
                    {loading ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Loan Inspection & Amortization Schedule */}
        {showDetailsModal && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <LuLandmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">
                      {selectedLoan.application_number} • {selectedLoan.type === "SALARY_ADVANCE" ? "Salary Advance" : "Company Loan"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Applicant: {selectedLoan.employee_name} ({selectedLoan.employee_id}) • {selectedLoan.department || "General"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedLoan.status)}
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <LuX className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* KPI Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Principal Sanctioned</span>
                  <span className="text-lg font-bold text-slate-900">
                    ₹{Number(selectedLoan.principal_amount).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Monthly EMI</span>
                  <span className="text-lg font-bold text-emerald-600">
                    ₹{Number(selectedLoan.monthly_emi).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Remaining Balance</span>
                  <span className="text-lg font-bold text-amber-600">
                    ₹{Number(selectedLoan.remaining_balance).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Paid Installments</span>
                  <span className="text-lg font-bold text-purple-600">
                    {selectedLoan.paid_installments || 0} / {selectedLoan.total_installments}
                  </span>
                </div>
              </div>

              {/* Multi-Level Sequential Approval Trail */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Sequential Approval & Sanction Trail
                </h4>
                <SequentialApprovalTimeline module="LOAN" entityId={selectedLoan.id} />
              </div>

              {/* Disbursement Info if active */}
              {selectedLoan.disbursement_date && (
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>Disbursed on:</strong> {selectedLoan.disbursement_date} via {selectedLoan.disbursement_mode}
                  </div>
                  <div>
                    <strong>Ref/UTR:</strong> <span className="font-mono">{selectedLoan.disbursement_ref}</span>
                  </div>
                  <div>
                    <strong>Disbursed By:</strong> {selectedLoan.disbursed_by || "Finance"}
                  </div>
                </div>
              )}

              {/* Amortization Schedule */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Amortization Deduction Schedule
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Month</th>
                        <th className="py-2 px-3">Opening</th>
                        <th className="py-2 px-3">EMI</th>
                        <th className="py-2 px-3">Principal</th>
                        <th className="py-2 px-3">Interest</th>
                        <th className="py-2 px-3">Closing</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(selectedLoan.repayment_schedule) &&
                        selectedLoan.repayment_schedule.map((row) => (
                          <tr key={row.installment_no} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-slate-500">{row.installment_no}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{row.month_label}</td>
                            <td className="py-2 px-3">₹{Number(row.opening_balance).toLocaleString("en-IN")}</td>
                            <td className="py-2 px-3 font-bold text-emerald-600">₹{Number(row.emi).toLocaleString("en-IN")}</td>
                            <td className="py-2 px-3">₹{Number(row.principal_component).toLocaleString("en-IN")}</td>
                            <td className="py-2 px-3 text-slate-500">₹{Number(row.interest_component).toLocaleString("en-IN")}</td>
                            <td className="py-2 px-3">₹{Number(row.closing_balance).toLocaleString("en-IN")}</td>
                            <td className="py-2 px-3">
                              {row.status === "PAID" ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                  <LuCircleCheck className="w-3.5 h-3.5" /> Paid
                                </span>
                              ) : (
                                <span className="text-amber-600 font-medium">Scheduled</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Repayment Log Records */}
              {Array.isArray(selectedLoan.repaymentLogs) && selectedLoan.repaymentLogs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Recorded Repayment History ({selectedLoan.repaymentLogs.length} Transactions)
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto max-h-48">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 sticky top-0 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Installment</th>
                          <th className="py-2 px-3">Amount Paid</th>
                          <th className="py-2 px-3">Remaining After</th>
                          <th className="py-2 px-3">Source</th>
                          <th className="py-2 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedLoan.repaymentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3">{log.deduction_date}</td>
                            <td className="py-2 px-3 font-semibold">#{log.installment_number}</td>
                            <td className="py-2 px-3 font-bold text-emerald-600">
                              ₹{Number(log.emi_amount).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2 px-3 font-mono">
                              ₹{Number(log.remaining_balance_after).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-semibold">
                                {log.payment_source}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{log.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  {(selectedLoan.status === "ACTIVE" || selectedLoan.status === "DISBURSED") && isFinanceOrHR && (
                    <button
                      onClick={() => {
                        setRepayAmount(String(selectedLoan.remaining_balance));
                        setShowRepayModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      Record Off-Cycle Repayment / Pre-payment
                    </button>
                  )}
                  {selectedLoan.status === "APPROVED" && isFinanceOrHR && (
                    <button
                      onClick={() => setShowDisburseModal(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      Disburse Loan Capital
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Disburse Loan Capital */}
        {showDisburseModal && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <LuCreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Record Fund Disbursement</h3>
                </div>
                <button
                  onClick={() => setShowDisburseModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  Beneficiary: <strong>{selectedLoan.employee_name}</strong> ({selectedLoan.employee_id})
                </div>
                <div className="mt-1">
                  Principal Sanctioned:{" "}
                  <strong className="text-emerald-700 text-sm">
                    ₹{Number(selectedLoan.principal_amount).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              <form onSubmit={handleDisburseSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Disbursement Mode</label>
                  <select
                    value={disburseForm.disbursement_mode}
                    onChange={(e) => setDisburseForm({ ...disburseForm, disbursement_mode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="Direct Payroll Credit">Direct Payroll Credit</option>
                    <option value="Cheque">Company Cheque</option>
                    <option value="UPI Corporate">Corporate UPI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">UTR / Transaction Reference</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UTR-HDFC982140284"
                    value={disburseForm.disbursement_ref}
                    onChange={(e) => setDisburseForm({ ...disburseForm, disbursement_ref: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    required
                    value={disburseForm.disbursement_date}
                    onChange={(e) => setDisburseForm({ ...disburseForm, disbursement_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDisburseModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    {loading ? "Processing..." : "Confirm & Disburse"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Manual Repayment / Prepayment */}
        {showRepayModal && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <LuReceipt className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Record Off-Cycle Pre-payment</h3>
                </div>
                <button
                  onClick={() => setShowRepayModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  Loan: <strong>{selectedLoan.application_number}</strong>
                </div>
                <div className="mt-1">
                  Current Outstanding Balance:{" "}
                  <strong className="text-amber-700 text-sm">
                    ₹{Number(selectedLoan.remaining_balance).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              <form onSubmit={handleRecordRepayment} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Repayment Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={Number(selectedLoan.remaining_balance)}
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <button
                      type="button"
                      onClick={() => setRepayAmount(String(selectedLoan.monthly_emi))}
                      className="text-emerald-600 hover:underline"
                    >
                      Pay 1 EMI (₹{Number(selectedLoan.monthly_emi).toLocaleString("en-IN")})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepayAmount(String(selectedLoan.remaining_balance))}
                      className="text-amber-600 hover:underline"
                    >
                      Pay Full Balance
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Remarks / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Employee requested advance settlement via cheque"
                    value={repayRemarks}
                    onChange={(e) => setRepayRemarks(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRepayModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm"
                  >
                    {loading ? "Recording..." : "Confirm Repayment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
