import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Spinner,
  Form,
  Modal,
  InputGroup,
  Dropdown,
  Nav,
  Alert,
} from "react-bootstrap";
import toast from "react-hot-toast";
import {
  LuPlus,
  LuSearch,
  LuFilter,
  LuDownload,
  LuEye,
  LuFileText,
  LuTrash2,
  LuRefreshCw,
  LuClock,
  LuCheck,
  LuCircleCheck,
  LuCircleX,
  LuBuilding2,
  LuBriefcase,
  LuIndianRupee,
  LuUserCheck,
  LuShieldCheck,
  LuWallet,
  LuPlane,
  LuReceipt,
  LuExternalLink,
  LuUpload,
  LuCreditCard,
  LuArrowRight,
  LuFileCheck,
} from "react-icons/lu";
import api, { getUploadUrl } from "../../api/axios";
import {
  formatINR,
  formatPDFAmount,
  formatDateStr,
  generateClaimVoucherPDF,
} from "../../utils/exitLetterGenerators";

// Standard Expense Categories
const EXPENSE_CATEGORIES = [
  "Air Travel",
  "Train Travel",
  "Cab / Taxi / Rideshare",
  "Fuel & Vehicle Mileage",
  "Hotel & Accommodation",
  "Meals & Daily Food (Per Diem)",
  "Client Meeting / Entertainment",
  "Office Stationery & Supplies",
  "Internet & Communication",
  "Course & Certification Fee",
  "Medical & Out-of-pocket",
  "Other Incidental Expense",
];

// Helper: Status badge styling
const getStatusBadge = (status) => {
  switch (status) {
    case "PAID":
      return <Badge bg="success" className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600">Reimbursed (Paid)</Badge>;
    case "APPROVED_BY_FINANCE":
      return <Badge bg="info" className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600">Approved for Payout</Badge>;
    case "APPROVED_BY_MANAGER":
      return <Badge bg="primary" className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600">Manager Approved (In Finance)</Badge>;
    case "SUBMITTED":
      return <Badge bg="warning" className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 text-slate-900">Pending Manager</Badge>;
    case "DRAFT":
      return <Badge bg="secondary" className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-500">Draft</Badge>;
    case "REJECTED_BY_MANAGER":
      return <Badge bg="danger" className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600">Rejected by Manager</Badge>;
    case "REJECTED_BY_FINANCE":
      return <Badge bg="danger" className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600">Rejected by Finance</Badge>;
    case "CANCELLED":
      return <Badge bg="dark" className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-700">Cancelled</Badge>;
    default:
      return <Badge bg="light" className="px-2.5 py-1 text-xs font-bold rounded-lg text-slate-700 border">{status}</Badge>;
  }
};

export default function ClaimsReimbursement() {
  // Current user & role context
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const activeRole = useMemo(() => {
    return (storedUser.role || localStorage.getItem("role") || "employee").toLowerCase().trim();
  }, [storedUser]);

  // Role permissions
  const isManagerTier = useMemo(() => {
    if (["hod", "manager", "teamlead", "admin", "hr", "hrmanager", "ceo", "coo", "management"].includes(activeRole)) return true;
    const desig = (storedUser.designation || "").toLowerCase();
    return /\b(hod|head|manager|mgr|lead|tl|agm|dgm|gm|director|supervisor)\b/i.test(desig);
  }, [activeRole, storedUser]);

  const isFinanceTier = useMemo(() => {
    if (["accounts", "payroll", "finance", "cfo", "admin", "hr", "hrmanager", "ceo", "coo", "management"].includes(activeRole)) return true;
    const desig = (storedUser.designation || "").toLowerCase();
    return /\b(finance|account|accountant|accounts|audit|billing)\b/i.test(desig);
  }, [activeRole, storedUser]);

  const isHROversightTier = useMemo(() => {
    return ["hr", "hrmanager", "admin", "ceo", "coo", "management"].includes(activeRole);
  }, [activeRole]);

  // Tab State: "my_claims", "manager_approvals", "finance_settlement", "hr_oversight"
  const [activeTab, setActiveTab] = useState("my_claims");

  // Data states
  const [loading, setLoading] = useState(false);
  const [myClaims, setMyClaims] = useState([]);
  const [myStats, setMyStats] = useState({
    total_count: 0,
    total_claimed_amount: 0,
    in_review_amount: 0,
    approved_unpaid_amount: 0,
    disbursed_amount: 0,
  });

  const [managerClaims, setManagerClaims] = useState([]);
  const [financeClaims, setFinanceClaims] = useState([]);
  const [financeStats, setFinanceStats] = useState({
    pending_audit_count: 0,
    pending_audit_amount: 0,
    pending_payout_count: 0,
    pending_payout_amount: 0,
    total_disbursed_amount: 0,
  });

  const [allCompanyClaims, setAllCompanyClaims] = useState([]);
  const [companyStats, setCompanyStats] = useState({
    total_claims: 0,
    total_amount_claimed: 0,
    pending_manager_count: 0,
    pending_finance_count: 0,
    total_approved_amount: 0,
    total_disbursed_amount: 0,
    rejected_count: 0,
    department_spending: {},
    type_spending: {},
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [uploadingReceiptIdx, setUploadingReceiptIdx] = useState(null);

  // New Claim Form State
  const [claimForm, setClaimForm] = useState({
    title: "",
    claim_type: "TRAVEL",
    travel_start_date: "",
    travel_end_date: "",
    travel_destination: "",
    purpose: "",
    items: [
      {
        expense_date: new Date().toISOString().split("T")[0],
        category: "Air Travel",
        merchant_name: "",
        description: "",
        bill_number: "",
        amount: "",
        tax_amount: 0,
        receipt_url: "",
        receipt_filename: "",
      },
    ],
  });

  // View Details Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedClaimForView, setSelectedClaimForView] = useState(null);

  // Manager Review Modal
  const [showManagerReviewModal, setShowManagerReviewModal] = useState(false);
  const [selectedClaimForReview, setSelectedClaimForReview] = useState(null);
  const [managerDecision, setManagerDecision] = useState("APPROVED");
  const [managerComments, setManagerComments] = useState("");
  const [processingManagerReview, setProcessingManagerReview] = useState(false);

  // Finance Review & Audit Modal
  const [showFinanceReviewModal, setShowFinanceReviewModal] = useState(false);
  const [selectedClaimForFinance, setSelectedClaimForFinance] = useState(null);
  const [financeDecision, setFinanceDecision] = useState("APPROVED");
  const [financeComments, setFinanceComments] = useState("");
  const [financeApprovedAmount, setFinanceApprovedAmount] = useState("");
  const [processingFinanceReview, setProcessingFinanceReview] = useState(false);

  // Finance Disbursement Modal
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [selectedClaimForDisburse, setSelectedClaimForDisburse] = useState(null);
  const [paymentMode, setPaymentMode] = useState("BANK_TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [processingDisburse, setProcessingDisburse] = useState(false);

  // HR Override Modal
  const [showHrOverrideModal, setShowHrOverrideModal] = useState(false);
  const [selectedClaimForOverride, setSelectedClaimForOverride] = useState(null);
  const [hrAction, setHrAction] = useState("FORCE_APPROVE_TO_FINANCE");
  const [hrNotes, setHrNotes] = useState("");
  const [processingHrAction, setProcessingHrAction] = useState(false);

  // Receipt Preview Lightbox
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);

  // =========================================================================
  // DATA FETCHING FUNCTIONS
  // =========================================================================

  // 1. Fetch Employee's Own Claims
  const fetchMyClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/claims/my?status=${statusFilter}&claim_type=${typeFilter}&search=${encodeURIComponent(searchQuery)}`
      );
      if (res.data?.success) {
        setMyClaims(res.data.data || []);
        if (res.data.stats) setMyStats(res.data.stats);
      }
    } catch (err) {
      console.error("Fetch my claims error:", err);
      toast.error("Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  // 2. Fetch Manager Approval Queue
  const fetchManagerClaims = useCallback(async () => {
    if (!isManagerTier) return;
    setLoading(true);
    try {
      const res = await api.get("/claims/workflow/manager-pending");
      if (res.data?.success) {
        setManagerClaims(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch manager claims error:", err);
    } finally {
      setLoading(false);
    }
  }, [isManagerTier]);

  // 3. Fetch Finance Queue
  const fetchFinanceClaims = useCallback(async () => {
    if (!isFinanceTier) return;
    setLoading(true);
    try {
      const res = await api.get("/claims/workflow/finance-pending");
      if (res.data?.success) {
        setFinanceClaims(res.data.data || []);
        if (res.data.stats) setFinanceStats(res.data.stats);
      }
    } catch (err) {
      console.error("Fetch finance claims error:", err);
    } finally {
      setLoading(false);
    }
  }, [isFinanceTier]);

  // 4. Fetch HR / Company Oversight Claims
  const fetchCompanyClaims = useCallback(async () => {
    if (!isHROversightTier) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/claims/oversight/all?status=${statusFilter}&department=${deptFilter}&claim_type=${typeFilter}&search=${encodeURIComponent(searchQuery)}`
      );
      if (res.data?.success) {
        setAllCompanyClaims(res.data.data || []);
        if (res.data.stats) setCompanyStats(res.data.stats);
      }
    } catch (err) {
      console.error("Fetch company claims error:", err);
    } finally {
      setLoading(false);
    }
  }, [isHROversightTier, statusFilter, deptFilter, typeFilter, searchQuery]);

  // Auto reload on tab change
  useEffect(() => {
    if (activeTab === "my_claims") fetchMyClaims();
    else if (activeTab === "manager_approvals") fetchManagerClaims();
    else if (activeTab === "finance_settlement") fetchFinanceClaims();
    else if (activeTab === "hr_oversight") fetchCompanyClaims();
  }, [activeTab, fetchMyClaims, fetchManagerClaims, fetchFinanceClaims, fetchCompanyClaims]);

  // Refresh All Handler
  const handleRefresh = () => {
    if (activeTab === "my_claims") fetchMyClaims();
    else if (activeTab === "manager_approvals") fetchManagerClaims();
    else if (activeTab === "finance_settlement") fetchFinanceClaims();
    else if (activeTab === "hr_oversight") fetchCompanyClaims();
  };

  // =========================================================================
  // CLAIM FORM MANAGEMENT (CREATE & DRAFT)
  // =========================================================================

  const handleOpenCreateModal = () => {
    setClaimForm({
      title: "",
      claim_type: "TRAVEL",
      travel_start_date: "",
      travel_end_date: "",
      travel_destination: "",
      purpose: "",
      items: [
        {
          expense_date: new Date().toISOString().split("T")[0],
          category: "Air Travel",
          merchant_name: "",
          description: "",
          bill_number: "",
          amount: "",
          tax_amount: 0,
          receipt_url: "",
          receipt_filename: "",
        },
      ],
    });
    setShowCreateModal(true);
  };

  const handleAddItemRow = () => {
    setClaimForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          expense_date: new Date().toISOString().split("T")[0],
          category: "Hotel & Accommodation",
          merchant_name: "",
          description: "",
          bill_number: "",
          amount: "",
          tax_amount: 0,
          receipt_url: "",
          receipt_filename: "",
        },
      ],
    }));
  };

  const handleRemoveItemRow = (idx) => {
    if (claimForm.items.length <= 1) {
      toast.error("A claim requires at least one item");
      return;
    }
    setClaimForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemChange = (idx, field, value) => {
    setClaimForm((prev) => {
      const nextItems = [...prev.items];
      nextItems[idx] = { ...nextItems[idx], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  // Receipt File Upload per Item
  const handleUploadReceiptFile = async (idx, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must not exceed 10 MB");
      return;
    }

    const formData = new FormData();
    formData.append("receipt", file);

    setUploadingReceiptIdx(idx);
    try {
      const res = await api.post("/claims/upload-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success && res.data.data?.url) {
        toast.success(`Receipt uploaded (${res.data.data.originalName || file.name})`);
        handleItemChange(idx, "receipt_url", res.data.data.url);
        handleItemChange(idx, "receipt_filename", res.data.data.originalName || file.name);
      }
    } catch (err) {
      console.error("Receipt upload error:", err);
      toast.error("Failed to upload receipt file");
    } finally {
      setUploadingReceiptIdx(null);
    }
  };

  // Compute live claim total amount
  const liveTotalAmount = useMemo(() => {
    return claimForm.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [claimForm.items]);

  // Submit Claim
  const handleSaveClaim = async (isDraft = false) => {
    if (!claimForm.title.trim()) {
      toast.error("Please enter a claim title / description");
      return;
    }

    if (!isDraft) {
      for (let i = 0; i < claimForm.items.length; i++) {
        const it = claimForm.items[i];
        if (!it.amount || parseFloat(it.amount) <= 0) {
          toast.error(`Item #${i + 1}: Please enter a valid expense amount`);
          return;
        }
      }
    }

    setSubmittingClaim(true);
    try {
      const payload = {
        ...claimForm,
        is_draft: isDraft,
      };

      const res = await api.post("/claims", payload);
      if (res.data?.success) {
        toast.success(res.data.message);
        setShowCreateModal(false);
        fetchMyClaims();
      } else {
        toast.error(res.data?.error || "Failed to submit claim");
      }
    } catch (err) {
      console.error("Save claim error:", err);
      toast.error(err.response?.data?.error || "Network error submitting claim");
    } finally {
      setSubmittingClaim(false);
    }
  };

  // Delete Draft Claim
  const handleDeleteClaim = async (claimId) => {
    if (!window.confirm("Are you sure you want to permanently delete this draft claim?")) return;
    try {
      const res = await api.delete(`/claims/${claimId}`);
      if (res.data?.success) {
        toast.success("Draft claim deleted");
        fetchMyClaims();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete claim");
    }
  };

  // Cancel Submitted Claim
  const handleCancelClaim = async (claimId) => {
    if (!window.confirm("Are you sure you want to cancel this submitted claim?")) return;
    try {
      const res = await api.post(`/claims/${claimId}/cancel`);
      if (res.data?.success) {
        toast.success("Claim cancelled");
        fetchMyClaims();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel claim");
    }
  };

  // =========================================================================
  // MANAGER APPROVAL ACTION
  // =========================================================================

  const handleOpenManagerReview = (claim) => {
    setSelectedClaimForReview(claim);
    setManagerDecision("APPROVED");
    setManagerComments("");
    setShowManagerReviewModal(true);
  };

  const handleProcessManagerReview = async () => {
    if (!selectedClaimForReview) return;
    setProcessingManagerReview(true);
    try {
      const res = await api.post(`/claims/${selectedClaimForReview.id}/manager-review`, {
        decision: managerDecision,
        comments: managerComments,
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setShowManagerReviewModal(false);
        fetchManagerClaims();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit manager review");
    } finally {
      setProcessingManagerReview(false);
    }
  };

  // =========================================================================
  // FINANCE AUDIT & DISBURSEMENT ACTION
  // =========================================================================

  const handleOpenFinanceReview = (claim) => {
    setSelectedClaimForFinance(claim);
    setFinanceDecision("APPROVED");
    setFinanceComments("");
    setFinanceApprovedAmount(claim.approved_amount || claim.total_amount);
    setShowFinanceReviewModal(true);
  };

  const handleProcessFinanceReview = async () => {
    if (!selectedClaimForFinance) return;
    setProcessingFinanceReview(true);
    try {
      const res = await api.post(`/claims/${selectedClaimForFinance.id}/finance-review`, {
        decision: financeDecision,
        comments: financeComments,
        approved_amount: parseFloat(financeApprovedAmount) || 0,
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setShowFinanceReviewModal(false);
        fetchFinanceClaims();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to process finance verification");
    } finally {
      setProcessingFinanceReview(false);
    }
  };

  // Open Disburse Modal
  const handleOpenDisburseModal = (claim) => {
    setSelectedClaimForDisburse(claim);
    setPaymentMode("BANK_TRANSFER");
    setPaymentReference(`UTR-${Date.now().toString().slice(-8)}`);
    setPaymentNotes(`Settled reimbursement for ${claim.claim_number}`);
    setShowDisburseModal(true);
  };

  const handleProcessDisbursement = async () => {
    if (!selectedClaimForDisburse) return;
    setProcessingDisburse(true);
    try {
      const res = await api.post(`/claims/${selectedClaimForDisburse.id}/disburse`, {
        payment_mode: paymentMode,
        payment_reference: paymentReference,
        payment_notes: paymentNotes,
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setShowDisburseModal(false);
        fetchFinanceClaims();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to disburse claim");
    } finally {
      setProcessingDisburse(false);
    }
  };

  // =========================================================================
  // HR OVERRIDE ACTION
  // =========================================================================

  const handleOpenHrOverride = (claim) => {
    setSelectedClaimForOverride(claim);
    setHrAction("FORCE_APPROVE_TO_FINANCE");
    setHrNotes("");
    setShowHrOverrideModal(true);
  };

  const handleProcessHrOverride = async () => {
    if (!selectedClaimForOverride) return;
    setProcessingHrAction(true);
    try {
      const res = await api.post(`/claims/${selectedClaimForOverride.id}/hr-override`, {
        action: hrAction,
        notes: hrNotes,
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setShowHrOverrideModal(false);
        fetchCompanyClaims();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to apply HR override action");
    } finally {
      setProcessingHrAction(false);
    }
  };

  // Open Dossier / View Details Modal
  const handleViewDetails = (claim) => {
    setSelectedClaimForView(claim);
    setShowViewModal(true);
  };

  return (
    <Container fluid className="py-6 px-4 md:px-8 space-y-6 max-w-7xl mx-auto">
      {/* ════════════════════════════════════════════════════════ */}
      {/* HEADER BANNER                                           */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-1">
            <LuWallet className="w-3.5 h-3.5" /> Corporate Expenses, Travel Claims &amp; Settlements
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 m-0">
            Claims &amp; Reimbursement Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Submit travel and out-of-pocket business expense claims with itemized bill receipts. Seamlessly track Line Manager endorsement, Finance verification audit, and payment disbursement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="light"
            onClick={handleRefresh}
            className="text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 hover:bg-slate-50"
          >
            <LuRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} /> Refresh
          </Button>

          <Button
            variant="success"
            onClick={handleOpenCreateModal}
            className="text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 border-0 flex items-center gap-1.5 text-white shadow-xs"
          >
            <LuPlus className="w-4 h-4" /> Submit New Claim
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* NAVIGATION TABS (ROLE-AWARE)                            */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-200">
        <Button
          variant={activeTab === "my_claims" ? "white" : "light"}
          onClick={() => setActiveTab("my_claims")}
          className={`text-xs font-bold rounded-xl py-2 px-4 transition-all flex items-center gap-2 border-0 ${activeTab === "my_claims" ? "bg-white text-slate-900 shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900 bg-transparent"
            }`}
        >
          <LuWallet className="w-4 h-4 text-emerald-600" /> My Expense Claims
          <Badge bg="light" className="text-slate-700 border text-[10px] ml-1">
            {myClaims.length}
          </Badge>
        </Button>

        {isManagerTier && (
          <Button
            variant={activeTab === "manager_approvals" ? "white" : "light"}
            onClick={() => setActiveTab("manager_approvals")}
            className={`text-xs font-bold rounded-xl py-2 px-4 transition-all flex items-center gap-2 border-0 ${activeTab === "manager_approvals" ? "bg-white text-slate-900 shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900 bg-transparent"
              }`}
          >
            <LuUserCheck className="w-4 h-4 text-indigo-600" /> Manager Endorsements
            {managerClaims.length > 0 && (
              <Badge bg="warning" className="text-slate-900 text-[10px] ml-1 bg-amber-400 font-bold">
                {managerClaims.length} Pending
              </Badge>
            )}
          </Button>
        )}

        {isFinanceTier && (
          <Button
            variant={activeTab === "finance_settlement" ? "white" : "light"}
            onClick={() => setActiveTab("finance_settlement")}
            className={`text-xs font-bold rounded-xl py-2 px-4 transition-all flex items-center gap-2 border-0 ${activeTab === "finance_settlement" ? "bg-white text-slate-900 shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900 bg-transparent"
              }`}
          >
            <LuCreditCard className="w-4 h-4 text-blue-600" /> Finance Audit &amp; Payouts
            {(financeStats.pending_audit_count + financeStats.pending_payout_count) > 0 && (
              <Badge bg="info" className="text-white text-[10px] ml-1 bg-blue-600 font-bold">
                {financeStats.pending_audit_count + financeStats.pending_payout_count} Actionable
              </Badge>
            )}
          </Button>
        )}

        {isHROversightTier && (
          <Button
            variant={activeTab === "hr_oversight" ? "white" : "light"}
            onClick={() => setActiveTab("hr_oversight")}
            className={`text-xs font-bold rounded-xl py-2 px-4 transition-all flex items-center gap-2 border-0 ${activeTab === "hr_oversight" ? "bg-white text-slate-900 shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900 bg-transparent"
              }`}
          >
            <LuShieldCheck className="w-4 h-4 text-purple-600" /> HR &amp; Company Oversight
            <Badge bg="light" className="text-purple-700 border border-purple-200 text-[10px] ml-1">
              Global
            </Badge>
          </Button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 1: MY CLAIMS (EMPLOYEE VIEW)                        */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "my_claims" && (
        <div className="space-y-6">
          {/* KPI CARDS */}
          <Row className="g-4">
            <Col xs={12} sm={6} lg={3}>
              <Card className="rounded-3xl border border-slate-200 shadow-xs p-4 bg-gradient-to-br from-white to-slate-50">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Claimed</div>
                  <div className="p-2.5 bg-slate-100 rounded-2xl text-slate-700">
                    <LuWallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  Rs. {formatPDFAmount(myStats.total_claimed_amount)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Across {myStats.total_count} filed vouchers</div>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="rounded-3xl border border-amber-200 shadow-xs p-4 bg-gradient-to-br from-white to-amber-50/40">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">In Review</div>
                  <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-700">
                    <LuClock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-900 mt-2">
                  Rs. {formatPDFAmount(myStats.in_review_amount)}
                </div>
                <div className="text-xs text-amber-700 mt-1">Awaiting Manager / Finance Audit</div>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="rounded-3xl border border-blue-200 shadow-xs p-4 bg-gradient-to-br from-white to-blue-50/40">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Approved (Unpaid)</div>
                  <div className="p-2.5 bg-blue-100 rounded-2xl text-blue-700">
                    <LuCircleCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-900 mt-2">
                  Rs. {formatPDFAmount(myStats.approved_unpaid_amount)}
                </div>
                <div className="text-xs text-blue-700 mt-1">Queued for Bank / Accounts Payout</div>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="rounded-3xl border border-emerald-200 shadow-xs p-4 bg-gradient-to-br from-white to-emerald-50/40">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Reimbursed &amp; Paid</div>
                  <div className="p-2.5 bg-emerald-100 rounded-2xl text-emerald-700">
                    <LuCreditCard className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-900 mt-2">
                  Rs. {formatPDFAmount(myStats.disbursed_amount)}
                </div>
                <div className="text-xs text-emerald-700 mt-1">Successfully settled to bank</div>
              </Card>
            </Col>
          </Row>

          {/* SEARCH & FILTERS */}
          <Card className="rounded-3xl border border-slate-200 shadow-xs p-4 bg-white">
            <Row className="g-3 items-center">
              <Col xs={12} md={5}>
                <InputGroup>
                  <InputGroup.Text className="bg-slate-50 border-slate-200 text-slate-400">
                    <LuSearch className="w-4 h-4" />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search by claim #, title, destination..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-slate-200 text-xs"
                  />
                </InputGroup>
              </Col>

              <Col xs={6} md={3}>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border-slate-200 text-xs rounded-xl"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">Pending Manager</option>
                  <option value="APPROVED_BY_MANAGER">Approved by Manager</option>
                  <option value="APPROVED_BY_FINANCE">Approved by Finance</option>
                  <option value="PAID">Paid / Disbursed</option>
                  <option value="DRAFT">Draft</option>
                  <option value="REJECTED_BY_MANAGER">Rejected</option>
                </Form.Select>
              </Col>

              <Col xs={6} md={3}>
                <Form.Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="border-slate-200 text-xs rounded-xl"
                >
                  <option value="ALL">All Types</option>
                  <option value="TRAVEL">Travel Claims</option>
                  <option value="GENERAL_EXPENSE">General Expenses</option>
                  <option value="CLIENT_MEETING">Client Meetings</option>
                  <option value="TRAINING_CERTIFICATION">Training &amp; Courses</option>
                  <option value="OFFICE_PURCHASE">Office Supplies</option>
                  <option value="OTHER">Other</option>
                </Form.Select>
              </Col>

              <Col xs={12} md={1} className="text-end">
                <Button
                  variant="light"
                  onClick={fetchMyClaims}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 py-2"
                >
                  Filter
                </Button>
              </Col>
            </Row>
          </Card>

          {/* MY CLAIMS TABLE */}
          <Card className="rounded-3xl border border-slate-300 shadow-xs overflow-hidden bg-white">
            <div className="p-4 pb-2 border-b border-slate-200 flex items-center justify-between">
              <div className="text-sm font-black text-slate-900">Submitted Expense Claims</div>
              <div className="text-xs text-slate-500">{myClaims.length} Records Found</div>
            </div>

            <div className="overflow-x-auto">
              <Table hover responsive className="align-middle mb-0 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">CLAIM #</th>
                    <th className="py-3 px-4">DATE</th>
                    <th className="py-3 px-4">TITLE &amp; DESTINATION</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">ITEMS</th>
                    <th className="py-3 px-4 text-end">CLAIMED (INR)</th>
                    <th className="py-3 px-4 text-end">SANCTIONED (INR)</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8">
                        <Spinner animation="border" size="sm" className="text-emerald-600" />
                        <span className="ms-2 text-slate-500">Loading claims...</span>
                      </td>
                    </tr>
                  ) : myClaims.length === 0 ? (
                    <tr className="">
                      <td colSpan={9} className="text-center py-4 text-slate-400">
                        <LuReceipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        No expense claims found matching your criteria.
                        <div className="mt-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={handleOpenCreateModal}
                            className="bg-emerald-600 border-0 text-xs font-bold"
                          >
                            + Submit First Claim
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    myClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900">{claim.claim_number}</div>
                          {claim.current_stage && (
                            <span className="text-[10px] text-slate-400">Stage: {claim.current_stage}</span>
                          )}
                        </td>
                        <td>{formatDateStr(claim.createdAt)}</td>
                        <td>
                          <div className="font-bold text-slate-800 max-w-xs truncate">{claim.title}</div>
                          {claim.travel_destination && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <LuPlane className="w-3 h-3 text-indigo-500" /> {claim.travel_destination}
                              {claim.travel_start_date && (
                                <span>({formatDateStr(claim.travel_start_date)})</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td>
                          <Badge bg="light" className="text-slate-700 border text-[11px]">
                            {claim.claim_type?.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td>
                          <span className="font-semibold text-slate-700">
                            {claim.items?.length || 0} bills
                          </span>
                        </td>
                        <td className="text-end font-bold text-slate-900">
                          Rs. {formatPDFAmount(claim.total_amount)}
                        </td>
                        <td className="text-end font-extrabold text-emerald-700">
                          Rs. {formatPDFAmount(claim.approved_amount || claim.total_amount)}
                        </td>
                        <td>{getStatusBadge(claim.status)}</td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => handleViewDetails(claim)}
                              className="rounded-lg p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              title="View Claim Dossier"
                            >
                              <LuEye className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => generateClaimVoucherPDF(claim)}
                              className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50"
                              title="Download Claim Voucher PDF"
                            >
                              <LuDownload className="w-3.5 h-3.5" />
                            </Button>

                            {claim.status === "SUBMITTED" && (
                              <Button
                                variant="light"
                                size="sm"
                                onClick={() => handleCancelClaim(claim.id)}
                                className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                                title="Cancel Submitted Claim"
                              >
                                <LuCircleX className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {claim.status === "DRAFT" && (
                              <Button
                                variant="light"
                                size="sm"
                                onClick={() => handleDeleteClaim(claim.id)}
                                className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                                title="Delete Draft"
                              >
                                <LuTrash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 2: MANAGER / HOD ENDORSEMENTS DESK                   */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "manager_approvals" && isManagerTier && (
        <div className="space-y-6">
          <Alert variant="info" className="rounded-2xl border-indigo-200 bg-indigo-50/50 text-indigo-900 text-xs flex items-center justify-between">
            <div>
              <strong>Manager Review Queue:</strong> The claims below are submitted by your department reportees and are awaiting your technical and business justification approval before routing to Finance.
            </div>
            <Badge bg="indigo" className="bg-indigo-600 text-white text-xs px-2.5 py-1">
              {managerClaims.length} Pending Actions
            </Badge>
          </Alert>

          <Card className="rounded-3xl border border-slate-200 shadow-xs overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table hover responsive className="align-middle mb-0 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">CLAIM #</th>
                    <th>EMPLOYEE</th>
                    <th>DEPARTMENT</th>
                    <th>CLAIM TITLE &amp; DESTINATION</th>
                    <th>BILLS</th>
                    <th className="text-end">CLAIMED (INR)</th>
                    <th>SUBMISSION DATE</th>
                    <th className="text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">
                        <Spinner animation="border" size="sm" className="me-2" /> Loading manager queue...
                      </td>
                    </tr>
                  ) : managerClaims.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-slate-400">
                        <LuCircleCheck className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                        No claims pending manager review. All caught up!
                      </td>
                    </tr>
                  ) : (
                    managerClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{claim.claim_number}</td>
                        <td>
                          <div className="font-bold text-slate-900">{claim.employee_name}</div>
                          <span className="text-[10px] text-slate-400">{claim.employee_id}</span>
                        </td>
                        <td>
                          <Badge bg="light" className="text-slate-700 border text-[11px]">
                            {claim.department}
                          </Badge>
                        </td>
                        <td>
                          <div className="font-semibold text-slate-800">{claim.title}</div>
                          {claim.travel_destination && (
                            <span className="text-[11px] text-slate-500">Dest: {claim.travel_destination}</span>
                          )}
                        </td>
                        <td>{claim.items?.length || 0} attached</td>
                        <td className="text-end font-extrabold text-slate-900">
                          Rs. {formatPDFAmount(claim.total_amount)}
                        </td>
                        <td>{formatDateStr(claim.createdAt)}</td>
                        <td className="text-center">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenManagerReview(claim)}
                            className="bg-indigo-600 hover:bg-indigo-700 border-0 rounded-xl px-3 py-1 font-bold text-xs"
                          >
                            Review &amp; Endorse
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 3: FINANCE AUDIT & DISBURSEMENT DESK                */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "finance_settlement" && isFinanceTier && (
        <div className="space-y-6">
          {/* Finance Metrics */}
          <Row className="g-4">
            <Col xs={12} sm={4}>
              <Card className="rounded-3xl border border-indigo-200 shadow-xs p-5 bg-gradient-to-br from-white to-indigo-50/40">
                <div className="text-xs font-bold text-indigo-700 uppercase">Awaiting Finance Audit</div>
                <div className="text-2xl font-black text-indigo-900 mt-2">
                  {financeStats.pending_audit_count} Claims
                </div>
                <div className="text-xs text-indigo-600 mt-1">
                  Rs. {formatPDFAmount(financeStats.pending_audit_amount)}
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={4}>
              <Card className="rounded-3xl border border-blue-200 shadow-xs p-5 bg-gradient-to-br from-white to-blue-50/40">
                <div className="text-xs font-bold text-blue-700 uppercase">Queued for Payout / Disbursement</div>
                <div className="text-2xl font-black text-blue-900 mt-2">
                  {financeStats.pending_payout_count} Claims
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Rs. {formatPDFAmount(financeStats.pending_payout_amount)}
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={4}>
              <Card className="rounded-3xl border border-emerald-200 shadow-xs p-5 bg-gradient-to-br from-white to-emerald-50/40">
                <div className="text-xs font-bold text-emerald-700 uppercase">Total Settled &amp; Disbursed</div>
                <div className="text-2xl font-black text-emerald-900 mt-2">
                  Rs. {formatPDFAmount(financeStats.total_disbursed_amount)}
                </div>
                <div className="text-xs text-emerald-600 mt-1">Direct Bank / Payroll credits</div>
              </Card>
            </Col>
          </Row>

          {/* Actionable Finance Table */}
          <Card className="rounded-3xl border border-slate-200 shadow-xs overflow-hidden bg-white">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-black text-slate-900">Finance Verification &amp; Disbursement Queue</div>
              <Badge bg="light" className="text-slate-600 border">
                {financeClaims.length} Claims In Pipeline
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <Table hover responsive className="align-middle mb-0 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">CLAIM #</th>
                    <th>EMPLOYEE &amp; DEPT</th>
                    <th>TITLE &amp; CATEGORY</th>
                    <th className="text-end">CLAIMED</th>
                    <th className="text-end">APPROVED</th>
                    <th>MANAGER ENDORSEMENT</th>
                    <th>CURRENT STATUS</th>
                    <th className="text-center">FINANCE ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">
                        <Spinner animation="border" size="sm" className="me-2" /> Loading finance queue...
                      </td>
                    </tr>
                  ) : financeClaims.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        No claims in finance workflow currently.
                      </td>
                    </tr>
                  ) : (
                    financeClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{claim.claim_number}</td>
                        <td>
                          <div className="font-bold text-slate-900">{claim.employee_name}</div>
                          <span className="text-[10px] text-slate-500">{claim.department} • {claim.employee_id}</span>
                        </td>
                        <td>
                          <div className="font-semibold text-slate-800">{claim.title}</div>
                          <span className="text-[10px] text-slate-400">{claim.claim_type} ({claim.items?.length || 0} items)</span>
                        </td>
                        <td className="text-end font-bold text-slate-900">
                          Rs. {formatPDFAmount(claim.total_amount)}
                        </td>
                        <td className="text-end font-extrabold text-emerald-700">
                          Rs. {formatPDFAmount(claim.approved_amount || claim.total_amount)}
                        </td>
                        <td>
                          <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <LuCheck className="w-3.5 h-3.5" /> {claim.manager_name || "Manager Approved"}
                          </div>
                          {claim.manager_comments && (
                            <div className="text-[10px] text-slate-400 italic truncate max-w-xs">"{claim.manager_comments}"</div>
                          )}
                        </td>
                        <td>{getStatusBadge(claim.status)}</td>
                        <td className="text-center">
                          {claim.status === "APPROVED_BY_MANAGER" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenFinanceReview(claim)}
                              className="bg-blue-600 hover:bg-blue-700 border-0 rounded-xl px-3 py-1 font-bold text-xs"
                            >
                              Verify &amp; Audit
                            </Button>
                          )}

                          {claim.status === "APPROVED_BY_FINANCE" && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleOpenDisburseModal(claim)}
                              className="bg-emerald-600 hover:bg-emerald-700 border-0 rounded-xl px-3 py-1 font-bold text-xs flex items-center gap-1 mx-auto"
                            >
                              <LuCreditCard className="w-3.5 h-3.5" /> Disburse Payout
                            </Button>
                          )}

                          {claim.status === "PAID" && (
                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => generateClaimVoucherPDF(claim)}
                              className="text-emerald-700 border border-emerald-200 rounded-xl px-2.5 py-1 text-xs font-bold"
                            >
                              Voucher Paid
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 4: HR GLOBAL OVERSIGHT HUB                          */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "hr_oversight" && isHROversightTier && (
        <div className="space-y-6">
          {/* Global KPI Cards */}
          <Row className="g-4">
            <Col xs={12} sm={6} lg={3}>
              <Card className="rounded-3xl border border-slate-200 shadow-xs p-5 bg-gradient-to-br from-white to-slate-50">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Total Claims</div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {companyStats.total_claims} Claims
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Rs. {formatPDFAmount(companyStats.total_amount_claimed)} Gross Volume
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="rounded-3xl border border-amber-200 shadow-xs p-5 bg-gradient-to-br from-white to-amber-50/40">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Manager Action</div>
                <div className="text-2xl font-black text-amber-900 mt-2">
                  {companyStats.pending_manager_count}
                </div>
                <div className="text-xs text-amber-600 mt-1">In departmental review</div>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="rounded-3xl border border-blue-200 shadow-xs p-5 bg-gradient-to-br from-white to-blue-50/40">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Pending Finance Audit</div>
                <div className="text-2xl font-black text-blue-900 mt-2">
                  {companyStats.pending_finance_count}
                </div>
                <div className="text-xs text-blue-600 mt-1">Manager-endorsed</div>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="rounded-3xl border border-emerald-200 shadow-xs p-5 bg-gradient-to-br from-white to-emerald-50/40">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Disbursed Volume</div>
                <div className="text-2xl font-black text-emerald-900 mt-2">
                  Rs. {formatPDFAmount(companyStats.total_disbursed_amount)}
                </div>
                <div className="text-xs text-emerald-600 mt-1">Settled &amp; closed</div>
              </Card>
            </Col>
          </Row>

          {/* Department Breakdown Pill Summary */}
          {Object.keys(companyStats.department_spending || {}).length > 0 && (
            <Card className="rounded-3xl border border-slate-200 shadow-xs p-4 bg-white">
              <div className="text-xs font-bold text-slate-500 uppercase mb-3">Reimbursed Spending by Department:</div>
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(companyStats.department_spending).map(([dept, amt]) => (
                  <Badge key={dept} bg="light" className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 text-xs flex items-center gap-1.5">
                    <LuBuilding2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-semibold">{dept}:</span> Rs. {formatPDFAmount(amt)}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* HR Master Company Claims Register */}
          <Card className="rounded-3xl border border-slate-200 shadow-xs overflow-hidden bg-white">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-900">Master Company Claims Register (HR Oversight)</div>
                <p className="text-[11px] text-slate-500 m-0">Full visibility into all organizational expenses, audit trails, and approvals</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="light"
                  size="sm"
                  onClick={fetchCompanyClaims}
                  className="rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1"
                >
                  <LuRefreshCw className="w-3.5 h-3.5" /> Refresh Registry
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table hover responsive className="align-middle mb-0 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">CLAIM #</th>
                    <th>EMPLOYEE</th>
                    <th>DEPARTMENT</th>
                    <th>TITLE &amp; CATEGORY</th>
                    <th className="text-end">CLAIMED</th>
                    <th className="text-end">SANCTIONED</th>
                    <th>WORKFLOW STAGE</th>
                    <th>STATUS</th>
                    <th className="text-center">HR ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-500">
                        <Spinner animation="border" size="sm" className="me-2" /> Loading master registry...
                      </td>
                    </tr>
                  ) : allCompanyClaims.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        No claims recorded across the organization.
                      </td>
                    </tr>
                  ) : (
                    allCompanyClaims.map((claim) => (
                      <tr key={claim.id}>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{claim.claim_number}</td>
                        <td>
                          <div className="font-bold text-slate-900">{claim.employee_name}</div>
                          <span className="text-[10px] text-slate-500">{claim.employee_id}</span>
                        </td>
                        <td>
                          <Badge bg="light" className="text-slate-700 border text-[11px]">
                            {claim.department}
                          </Badge>
                        </td>
                        <td>
                          <div className="font-semibold text-slate-800">{claim.title}</div>
                          <span className="text-[10px] text-slate-400">{claim.claim_type}</span>
                        </td>
                        <td className="text-end font-bold text-slate-900">
                          Rs. {formatPDFAmount(claim.total_amount)}
                        </td>
                        <td className="text-end font-extrabold text-emerald-700">
                          Rs. {formatPDFAmount(claim.approved_amount || claim.total_amount)}
                        </td>
                        <td>
                          <Badge bg="light" className="border text-indigo-700 border-indigo-200 text-[10px]">
                            {claim.current_stage}
                          </Badge>
                        </td>
                        <td>{getStatusBadge(claim.status)}</td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => handleViewDetails(claim)}
                              className="rounded-lg p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              title="View Full Dossier"
                            >
                              <LuEye className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => generateClaimVoucherPDF(claim)}
                              className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50"
                              title="Print/Download Voucher"
                            >
                              <LuDownload className="w-3.5 h-3.5" />
                            </Button>

                            {claim.status !== "PAID" && claim.status !== "CANCELLED" && (
                              <Button
                                variant="light"
                                size="sm"
                                onClick={() => handleOpenHrOverride(claim)}
                                className="rounded-lg p-1.5 text-purple-600 hover:bg-purple-50"
                                title="HR Override / Intervene"
                              >
                                <LuShieldCheck className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 1: SUBMIT NEW CLAIM & ITEMIZED EXPENSES           */}
      {/* ════════════════════════════════════════════════════════ */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="xl" centered>
        <Modal.Header closeButton className="px-6 py-4 pb-2">
          <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
            <LuWallet className="text-emerald-600 w-5 h-5" /> Submit Expense &amp; Travel Reimbursement Claim
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-6 space-y-4 py-2">
          {/* Claim Metadata Row */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Label className="text-xs font-bold text-slate-700">Claim Title / Subject *</Form.Label>
                <Form.Control
                  placeholder="e.g. Mumbai Client Workshop & Travel Expenses"
                  value={claimForm.title}
                  onChange={(e) => setClaimForm({ ...claimForm, title: e.target.value })}
                  className="border-slate-300 text-xs rounded-xl"
                  required
                />
              </Col>

              <Col xs={12} md={3}>
                <Form.Label className="text-xs font-bold text-slate-700">Claim Type *</Form.Label>
                <Form.Select
                  value={claimForm.claim_type}
                  onChange={(e) => setClaimForm({ ...claimForm, claim_type: e.target.value })}
                  className="border-slate-300 text-xs rounded-xl"
                >
                  <option value="TRAVEL">Travel &amp; Lodging</option>
                  <option value="GENERAL_EXPENSE">General Office Expense</option>
                  <option value="CLIENT_MEETING">Client Meeting &amp; Meal</option>
                  <option value="TRAINING_CERTIFICATION">Training &amp; Certification</option>
                  <option value="OFFICE_PURCHASE">Office Supplies</option>
                  <option value="OTHER">Other Expense</option>
                </Form.Select>
              </Col>

              <Col xs={12} md={3}>
                <Form.Label className="text-xs font-bold text-slate-700">Destination (if travel)</Form.Label>
                <Form.Control
                  placeholder="e.g. Mumbai / Bangalore"
                  value={claimForm.travel_destination}
                  onChange={(e) => setClaimForm({ ...claimForm, travel_destination: e.target.value })}
                  className="border-slate-300 text-xs rounded-xl"
                />
              </Col>

              {claimForm.claim_type === "TRAVEL" && (
                <>
                  <Col xs={6} md={3}>
                    <Form.Label className="text-xs font-bold text-slate-700">Travel Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={claimForm.travel_start_date}
                      onChange={(e) => setClaimForm({ ...claimForm, travel_start_date: e.target.value })}
                      className="border-slate-300 text-xs rounded-xl"
                    />
                  </Col>

                  <Col xs={6} md={3}>
                    <Form.Label className="text-xs font-bold text-slate-700">Travel End Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={claimForm.travel_end_date}
                      onChange={(e) => setClaimForm({ ...claimForm, travel_end_date: e.target.value })}
                      className="border-slate-300 text-xs rounded-xl"
                    />
                  </Col>
                </>
              )}

              <Col xs={12} md={claimForm.claim_type === "TRAVEL" ? 6 : 12}>
                <Form.Label className="text-xs font-bold text-slate-700">Business Purpose / Notes</Form.Label>
                <Form.Control
                  placeholder="Briefly state the business justification for this expenditure..."
                  value={claimForm.purpose}
                  onChange={(e) => setClaimForm({ ...claimForm, purpose: e.target.value })}
                  className="border-slate-300 text-xs rounded-xl"
                />
              </Col>
            </Row>
          </div>

          {/* Itemized Bills Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 m-0">Itemized Bills &amp; Receipts</h3>
                <span className="text-xs text-slate-500">Add individual receipts with invoice numbers and uploaded bill copies</span>
              </div>

              <Button
                variant="light"
                size="sm"
                onClick={handleAddItemRow}
                className="text-xs font-bold rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1"
              >
                <LuPlus className="w-3.5 h-3.5" /> Add Bill Item
              </Button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <Table hover className="align-middle mb-0 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th style={{ width: "130px" }}>DATE</th>
                    <th style={{ width: "180px" }}>CATEGORY</th>
                    <th style={{ width: "150px" }}>MERCHANT / VENDOR</th>
                    <th style={{ width: "130px" }}>BILL / INV #</th>
                    <th style={{ width: "130px" }} className="text-end">AMOUNT (INR)</th>
                    <th style={{ width: "180px" }}>RECEIPT FILE</th>
                    <th style={{ width: "50px" }} className="text-center">DEL</th>
                  </tr>
                </thead>
                <tbody>
                  {claimForm.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-bold text-slate-400 text-center">{idx + 1}</td>
                      <td>
                        <Form.Control
                          type="date"
                          size="sm"
                          value={item.expense_date}
                          onChange={(e) => handleItemChange(idx, "expense_date", e.target.value)}
                          className="text-xs"
                        />
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={item.category}
                          onChange={(e) => handleItemChange(idx, "category", e.target.value)}
                          className="text-xs"
                        >
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </Form.Select>
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          placeholder="e.g. Indigo / Uber"
                          value={item.merchant_name}
                          onChange={(e) => handleItemChange(idx, "merchant_name", e.target.value)}
                          className="text-xs"
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          placeholder="Inv # / PNR"
                          value={item.bill_number}
                          onChange={(e) => handleItemChange(idx, "bill_number", e.target.value)}
                          className="text-xs"
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          size="sm"
                          placeholder="0.00"
                          value={item.amount}
                          onChange={(e) => handleItemChange(idx, "amount", e.target.value)}
                          className="text-xs text-end font-bold"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td>
                        {item.receipt_url ? (
                          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-1 rounded-lg text-[11px]">
                            <LuReceipt className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[100px]">{item.receipt_filename || "Receipt"}</span>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => setReceiptPreviewUrl(getUploadUrl(item.receipt_url))}
                              className="p-0 text-emerald-700 hover:text-emerald-900 ms-auto"
                            >
                              <LuEye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              id={`receipt-file-${idx}`}
                              className="hidden"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleUploadReceiptFile(idx, e.target.files[0]);
                              }}
                            />
                            <label
                              htmlFor={`receipt-file-${idx}`}
                              className="cursor-pointer border border-dashed border-slate-300 hover:border-emerald-500 rounded-lg px-2.5 py-1 text-[11px] text-slate-600 flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors"
                            >
                              {uploadingReceiptIdx === idx ? (
                                <Spinner animation="border" size="sm" className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <>
                                  <LuUpload className="w-3 h-3 text-slate-400" /> Upload Bill
                                </>
                              )}
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="light"
                          size="sm"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Remove item"
                        >
                          <LuTrash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Total Summary Footer */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Total Line Items: <strong className="text-slate-800">{claimForm.items.length}</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase font-bold">Total Claim Amount:</span>
                <span className="text-xl font-black text-emerald-700">
                  Rs. {formatPDFAmount(liveTotalAmount)}
                </span>
              </div>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="px-6 py-3 flex items-center justify-between">
          <Button
            variant="light"
            onClick={() => handleSaveClaim(true)}
            disabled={submittingClaim}
            className="text-xs font-bold rounded-xl border border-slate-200"
          >
            Save as Draft
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="light"
              onClick={() => setShowCreateModal(false)}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={() => handleSaveClaim(false)}
              disabled={submittingClaim || liveTotalAmount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 border-0 text-xs font-bold rounded-xl px-5 text-white shadow-xs"
            >
              {submittingClaim ? <Spinner animation="border" size="sm" /> : "Submit Claim for Manager Review"}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 2: VIEW CLAIM DOSSIER & AUDIT TIMELINE           */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedClaimForView && (
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered>
          <Modal.Header closeButton className="border-b border-slate-200 px-6 py-4 pb-2">
            <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
              <LuFileText className="text-emerald-600 w-5 h-5" /> Claim Dossier: {selectedClaimForView.claim_number}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-6 py-2 space-y-4">
            {/* Header Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 m-0">{selectedClaimForView.title}</h3>
                <div className="text-xs text-slate-500 mt-1">
                  Submitted by: <strong>{selectedClaimForView.employee_name}</strong> ({selectedClaimForView.employee_id}) • {selectedClaimForView.department}
                </div>
              </div>
              <div>{getStatusBadge(selectedClaimForView.status)}</div>
            </div>

            {/* Travel / Purpose Info */}
            <Row className="g-3 text-xs">
              <Col xs={6} md={3}>
                <span className="text-slate-400 block font-semibold">Claim Type</span>
                <span className="font-bold text-slate-800">{selectedClaimForView.claim_type?.replace(/_/g, " ")}</span>
              </Col>
              <Col xs={6} md={3}>
                <span className="text-slate-400 block font-semibold">Travel Destination</span>
                <span className="font-bold text-slate-800">{selectedClaimForView.travel_destination || "N/A"}</span>
              </Col>
              <Col xs={6} md={3}>
                <span className="text-slate-400 block font-semibold">Travel Period</span>
                <span className="font-bold text-slate-800">
                  {selectedClaimForView.travel_start_date ? `${formatDateStr(selectedClaimForView.travel_start_date)} - ${formatDateStr(selectedClaimForView.travel_end_date)}` : "N/A"}
                </span>
              </Col>
              <Col xs={6} md={3}>
                <span className="text-slate-400 block font-semibold">Total Claimed</span>
                <span className="font-extrabold text-emerald-700 text-sm">Rs. {formatPDFAmount(selectedClaimForView.total_amount)}</span>
              </Col>
            </Row>

            {/* Items Table */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Itemized Bills &amp; Receipts:</div>
              <Table hover responsive className="align-middle text-xs border border-slate-200 rounded-xl mb-0">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th>#</th>
                    <th>DATE</th>
                    <th>CATEGORY</th>
                    <th>MERCHANT / DESCRIPTION</th>
                    <th>BILL #</th>
                    <th className="text-end">AMOUNT (INR)</th>
                    <th className="text-center">RECEIPT</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedClaimForView.items || []).map((item, i) => (
                    <tr key={item.id || i}>
                      <td>{i + 1}</td>
                      <td>{formatDateStr(item.expense_date)}</td>
                      <td>{item.category}</td>
                      <td>{item.merchant_name || item.description || "—"}</td>
                      <td>{item.bill_number || "—"}</td>
                      <td className="text-end font-bold text-slate-800">Rs. {formatPDFAmount(item.amount)}</td>
                      <td className="text-center">
                        {item.receipt_url ? (
                          <Button
                            variant="light"
                            size="sm"
                            onClick={() => setReceiptPreviewUrl(getUploadUrl(item.receipt_url))}
                            className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5"
                          >
                            <LuReceipt className="w-3 h-3 inline me-1" /> View
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No Bill</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Audit Trail Timeline */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase">Approval &amp; Audit Trail:</div>

              <div className="space-y-2 text-xs">
                {/* 1. Submission */}
                <div className="flex items-start gap-2">
                  <LuCircleCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Claim Submitted</span> by {selectedClaimForView.employee_name} on {formatDateStr(selectedClaimForView.createdAt)}
                  </div>
                </div>

                {/* 2. Manager Review */}
                <div className="flex items-start gap-2">
                  {selectedClaimForView.manager_decision === "APPROVED" ? (
                    <LuCircleCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : selectedClaimForView.manager_decision === "REJECTED" ? (
                    <LuCircleX className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  ) : (
                    <LuClock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800">Line Manager Endorsement:</span>{" "}
                    {selectedClaimForView.manager_name || "Department Head"}{" "}
                    — <span className="font-semibold">{selectedClaimForView.manager_decision}</span>
                    {selectedClaimForView.manager_comments && (
                      <div className="text-slate-500 italic mt-0.5">"{selectedClaimForView.manager_comments}"</div>
                    )}
                  </div>
                </div>

                {/* 3. Finance Audit */}
                <div className="flex items-start gap-2">
                  {selectedClaimForView.finance_decision === "APPROVED" ? (
                    <LuCircleCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : selectedClaimForView.finance_decision === "REJECTED" ? (
                    <LuCircleX className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  ) : (
                    <LuClock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800">Finance &amp; Accounts Audit:</span>{" "}
                    {selectedClaimForView.finance_name || "Finance Controller"}{" "}
                    — <span className="font-semibold">{selectedClaimForView.finance_decision}</span>
                    {selectedClaimForView.finance_comments && (
                      <div className="text-slate-500 italic mt-0.5">"{selectedClaimForView.finance_comments}"</div>
                    )}
                  </div>
                </div>

                {/* 4. Payment Settlement */}
                {selectedClaimForView.status === "PAID" && (
                  <div className="flex items-start gap-2">
                    <LuCreditCard className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-800">Reimbursement Disbursed &amp; Paid:</span>{" "}
                      Mode: {selectedClaimForView.payment_mode} • Ref/UTR: {selectedClaimForView.payment_reference} on {formatDateStr(selectedClaimForView.disbursed_at)}
                      {selectedClaimForView.payment_notes && (
                        <div className="text-slate-500 mt-0.5">{selectedClaimForView.payment_notes}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer className="border-t border-slate-200 px-6 py-4 pt-3 flex items-center justify-between">
            <Button
              variant="light"
              onClick={() => generateClaimVoucherPDF(selectedClaimForView)}
              className="text-xs font-bold rounded-xl border border-slate-200 text-indigo-600 flex items-center gap-1.5"
            >
              <LuDownload className="w-4 h-4" /> Download Official Voucher PDF
            </Button>

            <Button
              variant="light"
              onClick={() => setShowViewModal(false)}
              className="text-xs font-bold rounded-xl border"
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 3: MANAGER REVIEW & ENDORSEMENT                  */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedClaimForReview && (
        <Modal show={showManagerReviewModal} onHide={() => setShowManagerReviewModal(false)} size="md" centered>
          <Modal.Header closeButton className="border-b border-slate-100 px-6 py-4">
            <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
              <LuUserCheck className="text-indigo-600 w-5 h-5" /> Line Manager Review: {selectedClaimForReview.claim_number}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-6 space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-2xl border text-xs space-y-1">
              <div><strong>Claimant:</strong> {selectedClaimForReview.employee_name} ({selectedClaimForReview.department})</div>
              <div><strong>Claim Title:</strong> {selectedClaimForReview.title}</div>
              <div><strong>Total Amount:</strong> <span className="font-extrabold text-emerald-700">Rs. {formatPDFAmount(selectedClaimForReview.total_amount)}</span></div>
            </div>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Decision *</Form.Label>
              <div className="flex gap-4 mt-1">
                <Form.Check
                  type="radio"
                  id="mgr-approve"
                  label="Approve &amp; Route to Finance"
                  name="mgrDecision"
                  checked={managerDecision === "APPROVED"}
                  onChange={() => setManagerDecision("APPROVED")}
                  className="text-xs font-bold text-emerald-700"
                />
                <Form.Check
                  type="radio"
                  id="mgr-reject"
                  label="Reject Claim"
                  name="mgrDecision"
                  checked={managerDecision === "REJECTED"}
                  onChange={() => setManagerDecision("REJECTED")}
                  className="text-xs font-bold text-rose-700"
                />
              </div>
            </Form.Group>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Manager Review Comments</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter endorsement justification or reason for rejection..."
                value={managerComments}
                onChange={(e) => setManagerComments(e.target.value)}
                className="text-xs border-slate-300 rounded-xl"
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer className="border-t border-slate-100 px-6 py-4">
            <Button
              variant="light"
              onClick={() => setShowManagerReviewModal(false)}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant={managerDecision === "APPROVED" ? "primary" : "danger"}
              onClick={handleProcessManagerReview}
              disabled={processingManagerReview}
              className={`text-xs font-bold rounded-xl px-4 border-0 ${managerDecision === "APPROVED" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
            >
              {processingManagerReview ? <Spinner animation="border" size="sm" /> : `Submit ${managerDecision}`}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 4: FINANCE AUDIT & VERIFICATION                   */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedClaimForFinance && (
        <Modal show={showFinanceReviewModal} onHide={() => setShowFinanceReviewModal(false)} size="md" centered>
          <Modal.Header closeButton className="border-b border-slate-100 px-6 py-4">
            <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
              <LuCreditCard className="text-blue-600 w-5 h-5" /> Finance Audit: {selectedClaimForFinance.claim_number}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-6 space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-2xl border text-xs space-y-1">
              <div><strong>Claimant:</strong> {selectedClaimForFinance.employee_name} ({selectedClaimForFinance.department})</div>
              <div><strong>Manager Endorsement:</strong> {selectedClaimForFinance.manager_name} (Approved)</div>
              <div><strong>Claimed Amount:</strong> Rs. {formatPDFAmount(selectedClaimForFinance.total_amount)}</div>
            </div>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Finance Audit Decision *</Form.Label>
              <div className="flex gap-4 mt-1">
                <Form.Check
                  type="radio"
                  id="fin-approve"
                  label="Approve for Payout"
                  name="finDecision"
                  checked={financeDecision === "APPROVED"}
                  onChange={() => setFinanceDecision("APPROVED")}
                  className="text-xs font-bold text-emerald-700"
                />
                <Form.Check
                  type="radio"
                  id="fin-reject"
                  label="Reject Claim"
                  name="finDecision"
                  checked={financeDecision === "REJECTED"}
                  onChange={() => setFinanceDecision("REJECTED")}
                  className="text-xs font-bold text-rose-700"
                />
              </div>
            </Form.Group>

            {financeDecision === "APPROVED" && (
              <Form.Group>
                <Form.Label className="text-xs font-bold text-slate-700">Sanctioned Amount (INR) *</Form.Label>
                <Form.Control
                  type="number"
                  value={financeApprovedAmount}
                  onChange={(e) => setFinanceApprovedAmount(e.target.value)}
                  className="text-xs border-slate-300 rounded-xl font-bold"
                  step="0.01"
                />
                <Form.Text className="text-[11px] text-slate-500">
                  You can adjust the sanctioned amount if certain bill items are disallowed.
                </Form.Text>
              </Form.Group>
            )}

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Finance Audit Remarks</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Audit notes or reasons for line item deduction..."
                value={financeComments}
                onChange={(e) => setFinanceComments(e.target.value)}
                className="text-xs border-slate-300 rounded-xl"
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer className="border-t border-slate-100 px-6 py-4">
            <Button
              variant="light"
              onClick={() => setShowFinanceReviewModal(false)}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant={financeDecision === "APPROVED" ? "primary" : "danger"}
              onClick={handleProcessFinanceReview}
              disabled={processingFinanceReview}
              className={`text-xs font-bold rounded-xl px-4 border-0 ${financeDecision === "APPROVED" ? "bg-blue-600 hover:bg-blue-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
            >
              {processingFinanceReview ? <Spinner animation="border" size="sm" /> : `Confirm ${financeDecision}`}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 5: FINANCE DISBURSEMENT / SETTLEMENT              */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedClaimForDisburse && (
        <Modal show={showDisburseModal} onHide={() => setShowDisburseModal(false)} size="md" centered>
          <Modal.Header closeButton className="border-b border-slate-100 px-6 py-4">
            <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
              <LuCreditCard className="text-emerald-600 w-5 h-5" /> Record Payout Disbursement
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-6 space-y-4">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
              <div className="text-xs text-emerald-800">Claimant: <strong>{selectedClaimForDisburse.employee_name}</strong></div>
              <div className="text-xs text-emerald-800">Voucher #: <strong>{selectedClaimForDisburse.claim_number}</strong></div>
              <div className="text-lg font-black text-emerald-900 mt-2">
                Settlement Amount: Rs. {formatPDFAmount(selectedClaimForDisburse.approved_amount || selectedClaimForDisburse.total_amount)}
              </div>
            </div>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Payment Mode *</Form.Label>
              <Form.Select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="text-xs border-slate-300 rounded-xl"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="UPI">UPI Direct Payment</option>
                <option value="PAYROLL_ADDITION">Payroll Reimbursement Credit</option>
                <option value="CHEQUE">Cheque Issue</option>
                <option value="CASH">Petty Cash</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Transaction / UTR Reference # *</Form.Label>
              <Form.Control
                placeholder="e.g. UTR1234567890 / NEFT Ref"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="text-xs border-slate-300 rounded-xl font-bold"
                required
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Settlement Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Optional notes regarding bank account credit..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="text-xs border-slate-300 rounded-xl"
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer className="border-t border-slate-100 px-6 py-4">
            <Button
              variant="light"
              onClick={() => setShowDisburseModal(false)}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleProcessDisbursement}
              disabled={processingDisburse || !paymentReference.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 border-0 text-xs font-bold rounded-xl px-5 text-white"
            >
              {processingDisburse ? <Spinner animation="border" size="sm" /> : "Confirm & Mark as PAID"}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 6: HR OVERSIGHT INTERVENTION                      */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedClaimForOverride && (
        <Modal show={showHrOverrideModal} onHide={() => setShowHrOverrideModal(false)} size="md" centered>
          <Modal.Header closeButton className="border-b border-slate-100 px-6 py-4">
            <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
              <LuShieldCheck className="text-purple-600 w-5 h-5" /> HR Oversight Intervention: {selectedClaimForOverride.claim_number}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-6 space-y-4">
            <Alert variant="warning" className="rounded-2xl text-xs py-2">
              HR override bypasses standard workflow routing and logs an administrative audit record.
            </Alert>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Select HR Action *</Form.Label>
              <Form.Select
                value={hrAction}
                onChange={(e) => setHrAction(e.target.value)}
                className="text-xs border-slate-300 rounded-xl"
              >
                <option value="FORCE_APPROVE_TO_FINANCE">Force Bypass to Finance (Manager Approved)</option>
                <option value="FORCE_APPROVE_TO_PAYOUT">Force Sanction for Payout (Finance Approved)</option>
                <option value="ADD_NOTE">Add Official HR Note</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Administrative Remarks *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Reason for HR intervention..."
                value={hrNotes}
                onChange={(e) => setHrNotes(e.target.value)}
                className="text-xs border-slate-300 rounded-xl"
                required
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer className="border-t border-slate-100 px-6 py-4">
            <Button
              variant="light"
              onClick={() => setShowHrOverrideModal(false)}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleProcessHrOverride}
              disabled={processingHrAction || !hrNotes.trim()}
              className="bg-purple-600 hover:bg-purple-700 border-0 text-xs font-bold rounded-xl px-4"
            >
              {processingHrAction ? <Spinner animation="border" size="sm" /> : "Apply HR Action"}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 7: RECEIPT PREVIEW LIGHTBOX                       */}
      {/* ════════════════════════════════════════════════════════ */}
      {receiptPreviewUrl && (
        <Modal show={true} onHide={() => setReceiptPreviewUrl(null)} size="lg" centered>
          <Modal.Header closeButton className="border-b border-slate-100 px-6 py-4">
            <Modal.Title className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <LuReceipt className="text-emerald-600 w-4 h-4" /> Uploaded Receipt Preview
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4 text-center bg-slate-950 rounded-b-2xl">
            {receiptPreviewUrl.endsWith(".pdf") ? (
              <iframe
                src={receiptPreviewUrl}
                title="Receipt PDF"
                className="w-full h-[500px] rounded-xl border-0"
              />
            ) : (
              <img
                src={receiptPreviewUrl}
                alt="Receipt"
                className="max-h-[550px] max-w-full mx-auto object-contain rounded-xl shadow-lg"
              />
            )}
          </Modal.Body>
        </Modal>
      )}
    </Container>
  );
}

