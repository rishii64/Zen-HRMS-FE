import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
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
} from "react-bootstrap";
import toast from "react-hot-toast";
import {
  LuPlus,
  LuSearch,
  LuFilter,
  LuDownload,
  LuSend,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuCalendar,
  LuBuilding2,
  LuBriefcase,
  LuIndianRupee,
  LuUserCheck,
  LuShieldCheck,
  LuRefreshCw,
  LuEye,
  LuTrash2,
  LuExternalLink,
  LuCopy,
  LuFileText,
  LuCheck,
  LuFileCheck,
} from "react-icons/lu";
import api, { getApiBaseUrl } from "../../../api/axios";
import {
  formatINR,
  formatPDFAmount,
  amountInWords,
  formatDateStr,
  generateOfferLetterPDF,
} from "../../../utils/exitLetterGenerators";

const API = getApiBaseUrl();

export default function OfferManagementDesk({ token, activeRole, currentUser = {} }) {
  const [offers, setOffers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending_approval: 0,
    approved: 0,
    sent: 0,
    accepted: 0,
    declined: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Create / Edit Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [form, setForm] = useState({
    candidate_id: "",
    requisition_id: "",
    annual_ctc: "",
    annual_performance_bonus: 0,
    joining_date: "",
    offer_expiry_date: "",
    work_location: "Kolkata HQ",
    reporting_manager: "",
    employment_type: "Full Time (Probation)",
    probation_period_months: 6,
    notice_period_days: 30,
    other_benefits_notes: "Comprehensive Mediclaim coverage for self & family, Annual Performance Bonus.",
    submit_for_approval: true,
  });
  const [liveBreakdown, setLiveBreakdown] = useState(null);

  // Approval Modal State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedOfferForAction, setSelectedOfferForAction] = useState(null);
  const [approvalDecision, setApprovalDecision] = useState("APPROVED");
  const [approvalComments, setApprovalComments] = useState("");
  const [processingApproval, setProcessingApproval] = useState(false);

  // View Details Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOfferForView, setSelectedOfferForView] = useState(null);

  // Fetch Offers List
  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/offers?status=${statusFilter}&department=${deptFilter}&search=${encodeURIComponent(searchQuery)}`);
      const data = res.data;
      if (data?.success) {
        setOffers(data.data || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Fetch offers error:", err);
      if (err.response?.status !== 404) {
        toast.error("Failed to load offer registry");
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, deptFilter, searchQuery]);

  // Fetch Candidates & Requisitions for Offer Creation Dropdown
  const fetchCandidatesAndRequisitions = async () => {
    try {
      const [candRes, reqRes] = await Promise.all([
        api.get("/recruitment/candidates"),
        api.get("/recruitment/requisitions"),
      ]);
      if (candRes.data?.success) setCandidates(candRes.data.data || []);
      if (reqRes.data?.success) setRequisitions(reqRes.data.data || []);
    } catch (err) {
      console.warn("Could not pre-fetch candidates/requisitions:", err.message);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    fetchCandidatesAndRequisitions();
  }, []);

  // Handle Candidate Selection in Create Form
  const handleCandidateChange = (candId) => {
    setSelectedCandidateId(candId);
    const cand = candidates.find((c) => c.id === candId);
    if (!cand) return;

    // Find linked requisition
    const req = requisitions.find((r) => r.id === cand.requisition_id);

    // Default CTC to candidate expected_ctc or requisition max_salary
    const defaultCtc = cand.expected_ctc || req?.max_salary || 600000;

    // Default joining date: +15 or +30 days
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 20);
    const joiningDateStr = nextMonth.toISOString().split("T")[0];

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    const expiryDateStr = expiryDate.toISOString().split("T")[0];

    setForm((prev) => ({
      ...prev,
      candidate_id: cand.id,
      requisition_id: cand.requisition_id,
      annual_ctc: defaultCtc,
      joining_date: joiningDateStr,
      offer_expiry_date: expiryDateStr,
      reporting_manager: req?.hod_name || "Department Head",
    }));

    recalculateLiveBreakdown(defaultCtc, form.annual_performance_bonus);
  };

  // Recalculate salary breakdown on CTC change
  const recalculateLiveBreakdown = (ctcVal, bonusVal = 0) => {
    const ctc = parseFloat(ctcVal) || 0;
    const bonus = parseFloat(bonusVal) || 0;
    const fixedAnnual = Math.max(0, ctc - bonus);
    const monthlyGross = parseFloat((fixedAnnual / 12).toFixed(2));
    const monthlyBasic = parseFloat((monthlyGross * 0.5).toFixed(2));
    const monthlyHra = parseFloat((monthlyBasic * 0.4).toFixed(2));
    const monthlyConveyance = monthlyGross >= 25000 ? 1600 : 800;
    const monthlyMedical = monthlyGross >= 25000 ? 1250 : 500;
    const employerPf = parseFloat(Math.min(1800, monthlyBasic * 0.12).toFixed(2));
    const allocated = monthlyBasic + monthlyHra + monthlyConveyance + monthlyMedical;
    const monthlySpecial = parseFloat(Math.max(0, monthlyGross - allocated).toFixed(2));

    setLiveBreakdown({
      annual_ctc: ctc,
      monthly_gross: monthlyGross,
      monthly_basic: monthlyBasic,
      monthly_hra: monthlyHra,
      monthly_conveyance: monthlyConveyance,
      monthly_medical: monthlyMedical,
      monthly_special_allowance: monthlySpecial,
      employer_pf_monthly: employerPf,
      employer_pf_annual: employerPf * 12,
      annual_performance_bonus: bonus,
    });
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setSelectedCandidateId("");
    setLiveBreakdown(null);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setForm({
      candidate_id: "",
      requisition_id: "",
      annual_ctc: "",
      annual_performance_bonus: 0,
      joining_date: "",
      offer_expiry_date: nextWeek.toISOString().split("T")[0],
      work_location: "Kolkata HQ",
      reporting_manager: "",
      employment_type: "Full Time (Probation)",
      probation_period_months: 6,
      notice_period_days: 30,
      other_benefits_notes: "Comprehensive Mediclaim coverage for self & family, Annual Performance Bonus.",
      submit_for_approval: true,
    });
    setShowCreateModal(true);
  };

  // Submit Create Offer
  const handleSaveOffer = async (e) => {
    e.preventDefault();
    if (!form.candidate_id) {
      toast.error("Please select a candidate");
      return;
    }
    if (!form.annual_ctc || form.annual_ctc <= 0) {
      toast.error("Please enter a valid Annual CTC");
      return;
    }
    if (!form.joining_date) {
      toast.error("Please select proposed joining date");
      return;
    }

    setSubmittingOffer(true);
    try {
      const res = await api.post("/offers", form);
      const data = res.data;
      if (data?.success) {
        toast.success(data.message || "Offer generated successfully!");
        setShowCreateModal(false);
        fetchOffers();
      } else {
        toast.error(data?.error || "Failed to generate offer");
      }
    } catch (err) {
      console.error("Save offer error:", err);
      toast.error(err.response?.data?.error || "Network error while generating offer");
    } finally {
      setSubmittingOffer(false);
    }
  };

  // Open Approval Modal
  const handleOpenApprovalModal = (offer) => {
    setSelectedOfferForAction(offer);
    setApprovalDecision("APPROVED");
    setApprovalComments("");
    setShowApproveModal(true);
  };

  // Submit Approval Decision
  const handleProcessApproval = async () => {
    if (!selectedOfferForAction) return;
    setProcessingApproval(true);
    try {
      const res = await api.post(`/offers/${selectedOfferForAction.id}/approve`, {
        decision: approvalDecision,
        comments: approvalComments,
      });
      const data = res.data;
      if (data?.success) {
        toast.success(data.message);
        setShowApproveModal(false);
        fetchOffers();
      } else {
        toast.error(data?.error || "Approval submission failed");
      }
    } catch (err) {
      console.error("Approval error:", err);
      toast.error(err.response?.data?.error || "Network error submitting approval");
    } finally {
      setProcessingApproval(false);
    }
  };

  // Send Offer to Candidate
  const handleSendOfferToCandidate = async (offer) => {
    if (!window.confirm(`Are you sure you want to release and dispatch the approved offer to ${offer.candidate_name} (${offer.candidate_email})?`)) {
      return;
    }
    const toastId = toast.loading("Releasing offer & dispatching candidate notification...");
    try {
      const res = await api.post(`/offers/${offer.id}/send`);
      const data = res.data;
      if (data?.success) {
        toast.success(data.message || "Offer successfully released to candidate!", { id: toastId });
        fetchOffers();
      } else {
        toast.error(data?.error || "Failed to release offer", { id: toastId });
      }
    } catch (err) {
      console.error("Send offer error:", err);
      toast.error(err.response?.data?.error || "Error releasing offer", { id: toastId });
    }
  };

  // Copy Candidate Acceptance Link
  const handleCopyLink = (tokenStr) => {
    if (!tokenStr) return;
    const url = `${window.location.origin}/offer-acceptance/${tokenStr}`;
    navigator.clipboard.writeText(url);
    toast.success("Candidate digital acceptance link copied to clipboard!");
  };

  // Delete Draft Offer
  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm("Are you sure you want to delete this draft offer?")) return;
    try {
      const res = await api.delete(`/offers/${offerId}`);
      const data = res.data;
      if (data?.success) {
        toast.success("Draft offer deleted");
        fetchOffers();
      } else {
        toast.error(data?.error || "Failed to delete");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.error || "Error deleting offer");
    }
  };

  // Department list for filter
  const departments = useMemo(() => {
    const list = new Set(offers.map((o) => o.department).filter(Boolean));
    return ["ALL", ...Array.from(list)];
  }, [offers]);

  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════════════ */}
      {/* TOP HEADER & ACTION BANNER                              */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-1">
            <LuFileCheck className="w-3.5 h-3.5" /> Corporate Offer Letters &amp; Approvals
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 m-0">
            Offer Management &amp; Digital Acceptance
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Design corporate offer letters, route compensation through multi-stage executive approval (HOD &amp; Management), and track candidate digital acceptances in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="light"
            onClick={fetchOffers}
            className="text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5"
          >
            <LuRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} /> Refresh
          </Button>

          {["hr", "admin", "hrmanager"].includes(activeRole) && (
            <Button
              onClick={handleOpenCreateModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 shadow-sm flex items-center gap-1.5"
            >
              <LuPlus className="w-4 h-4" /> Generate New Offer
            </Button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SUMMARY KPI CARDS                                      */}
      {/* ════════════════════════════════════════════════════════ */}
      <Row className="g-3">
        <Col xs={6} md={2}>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Generated</span>
              <LuBriefcase className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          </div>
        </Col>

        <Col xs={6} md={2}>
          <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs bg-amber-50/20">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pending Review</span>
              <LuClock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.pending_approval}</div>
          </div>
        </Col>

        <Col xs={6} md={2}>
          <div className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-xs bg-blue-50/20">
            <div className="flex items-center justify-between text-blue-700">
              <span className="text-[10px] font-bold uppercase tracking-wider">Approved (Ready)</span>
              <LuShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-600 mt-1">{stats.approved}</div>
          </div>
        </Col>

        <Col xs={6} md={2}>
          <div className="bg-white rounded-2xl p-4 border border-purple-200/80 shadow-xs bg-purple-50/20">
            <div className="flex items-center justify-between text-purple-700">
              <span className="text-[10px] font-bold uppercase tracking-wider">Sent to Candidate</span>
              <LuSend className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-600 mt-1">{stats.sent}</div>
          </div>
        </Col>

        <Col xs={6} md={2}>
          <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs bg-emerald-50/20">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[10px] font-bold uppercase tracking-wider">Accepted &amp; Confirmed</span>
              <LuCircleCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.accepted}</div>
          </div>
        </Col>

        <Col xs={6} md={2}>
          <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs bg-rose-50/20">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[10px] font-bold uppercase tracking-wider">Declined</span>
              <LuCircleX className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1">{stats.declined}</div>
          </div>
        </Col>
      </Row>

      {/* ════════════════════════════════════════════════════════ */}
      {/* FILTER & REGISTRY TABLE                                */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2 flex-grow max-w-lg">
            <InputGroup size="sm" className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              <InputGroup.Text className="bg-transparent border-0 text-slate-400">
                <LuSearch className="w-4 h-4" />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search candidate name, offer code, position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 shadow-none text-xs"
              />
            </InputGroup>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-semibold">Status:</span>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl text-xs font-semibold"
              >
                <option value="ALL">All Lifecycle</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVAL_PENDING">Pending Approval</option>
                <option value="APPROVED">Approved (Ready to Send)</option>
                <option value="SENT_TO_CANDIDATE">Sent to Candidate</option>
                <option value="ACCEPTED">Digitally Accepted</option>
                <option value="DECLINED">Declined</option>
              </Form.Select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-semibold">Dept:</span>
              <Form.Select
                size="sm"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-xl text-xs font-semibold"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <Table hover responsive className="mb-0 text-xs align-middle">
            <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Offer Code &amp; Date</th>
                <th className="py-3 px-3">Candidate Details</th>
                <th className="py-3 px-3">Position &amp; Dept</th>
                <th className="py-3 px-3 text-center">Annual CTC (Gross)</th>
                <th className="py-3 px-3 text-center">Joining &amp; Expiry</th>
                <th className="py-3 px-3 text-center">Approval Stage</th>
                <th className="py-3 px-3 text-center">Offer Status</th>
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    <Spinner animation="border" size="sm" variant="primary" className="me-2" />
                    Loading offer registry...
                  </td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    <LuFileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <div className="font-bold text-slate-600">No Offer Letters Found</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No offers match your current filter criteria. Click "Generate New Offer" to roll out an appointment.
                    </p>
                  </td>
                </tr>
              ) : (
                offers.map((offer) => {
                  const isHODApprover = activeRole === "hod" && offer.current_approval_stage === "HOD";
                  const isMgmtApprover = ["admin", "hr", "hrmanager", "ceo", "coo"].includes(activeRole) && offer.current_approval_stage === "MANAGEMENT";
                  const canApprove = (isHODApprover || isMgmtApprover) && offer.approval_status !== "APPROVED";

                  return (
                    <tr key={offer.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 font-mono">{offer.offer_code}</div>
                        <div className="text-[10px] text-slate-400">Created: {formatDateStr(offer.createdAt)}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{offer.candidate_name}</div>
                        <div className="text-[10px] text-slate-500">{offer.candidate_email}</div>
                        {offer.candidate_phone && (
                          <div className="text-[9px] text-slate-400 font-mono">{offer.candidate_phone}</div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{offer.designation}</div>
                        <div className="text-[10px] text-slate-500">{offer.department}</div>
                        <div className="text-[9px] text-indigo-600 font-medium">{offer.work_location}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-black text-slate-900 text-sm">
                          {formatINR(offer.annual_ctc)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {formatINR(offer.monthly_gross)} / mo
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800">{formatDateStr(offer.joining_date)}</div>
                        <div className="text-[10px] text-rose-600">Expires: {formatDateStr(offer.offer_expiry_date)}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {offer.approval_status === "APPROVED" ? (
                          <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <LuCheck className="w-3 h-3" /> Fully Approved
                          </span>
                        ) : offer.approval_status === "PENDING_HOD_APPROVAL" ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            HOD Review
                          </span>
                        ) : offer.approval_status === "PENDING_MANAGEMENT_APPROVAL" ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            Management Review
                          </span>
                        ) : offer.approval_status === "REJECTED" ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            Rejected
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            Draft
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                            offer.offer_status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : offer.offer_status === "SENT_TO_CANDIDATE"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : offer.offer_status === "APPROVED"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : offer.offer_status === "DECLINED"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {offer.offer_status === "SENT_TO_CANDIDATE"
                            ? "Sent to Candidate"
                            : offer.offer_status === "ACCEPTED"
                            ? "Accepted & Confirmed"
                            : offer.offer_status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-end">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {/* Approve Action */}
                          {canApprove && (
                            <button
                              type="button"
                              onClick={() => handleOpenApprovalModal(offer)}
                              className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Review & Take Approval Action"
                            >
                              <LuShieldCheck className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}

                          {/* Send to Candidate Button */}
                          {offer.offer_status === "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => handleSendOfferToCandidate(offer)}
                              className="px-2 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                              title="Release & Send Offer Letter"
                            >
                              <LuSend className="w-3.5 h-3.5" /> Release Offer
                            </button>
                          )}

                          {/* Copy Link Button */}
                          {offer.acceptance_token && (
                            <button
                              type="button"
                              onClick={() => handleCopyLink(offer.acceptance_token)}
                              className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Copy Candidate Acceptance Portal Link"
                            >
                              <LuCopy className="w-3.5 h-3.5 text-slate-500" /> Link
                            </button>
                          )}

                          {/* Download PDF Button */}
                          <button
                            type="button"
                            onClick={() => generateOfferLetterPDF(offer)}
                            className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Download Official Offer Letter (PDF)"
                          >
                            <LuDownload className="w-3.5 h-3.5 text-indigo-600" /> PDF
                          </button>

                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOfferForView(offer);
                              setShowViewModal(true);
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="View Full Offer Details"
                          >
                            <LuEye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete for Draft */}
                          {offer.offer_status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOffer(offer.id)}
                              className="px-1.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Draft Offer"
                            >
                              <LuTrash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 1: CREATE NEW OFFER                                */}
      {/* ════════════════════════════════════════════════════════ */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
            <LuFileText className="text-indigo-600 w-5 h-5" />
            <span>Generate Employment Offer Letter</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3 max-h-[82vh] overflow-y-auto">
          <Form onSubmit={handleSaveOffer} className="space-y-4">
            {/* Step 1: Candidate Selector */}
            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200">
              <Form.Label className="text-xs font-bold text-indigo-950 mb-1">
                Select Candidate from Recruitment Pipeline *
              </Form.Label>
              <Form.Select
                value={selectedCandidateId}
                onChange={(e) => handleCandidateChange(e.target.value)}
                className="text-xs rounded-xl"
                required
              >
                <option value="">-- Choose Candidate to Extend Offer --</option>
                {candidates.map((c) => {
                  const req = requisitions.find((r) => r.id === c.requisition_id);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.candidate_name} — {req?.position || "Role"} ({req?.department || "Dept"}) [Stage: {c.interview_stage}]
                    </option>
                  );
                })}
              </Form.Select>
              <div className="text-[11px] text-indigo-700 mt-1">
                ℹ️ Selecting a candidate automatically resolves their position, department, and salary parameters.
              </div>
            </div>

            {selectedCandidateId && (
              <>
                {/* Step 2: Key Engagement Parameters */}
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label className="text-xs font-bold text-slate-700">Proposed Annual CTC (INR) *</Form.Label>
                    <InputGroup size="sm">
                      <InputGroup.Text className="bg-slate-100 font-bold text-xs">₹</InputGroup.Text>
                      <Form.Control
                        type="number"
                        placeholder="e.g. 900000"
                        value={form.annual_ctc}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({ ...prev, annual_ctc: val }));
                          recalculateLiveBreakdown(val, form.annual_performance_bonus);
                        }}
                        className="font-bold text-xs rounded-e-xl"
                        required
                      />
                    </InputGroup>
                  </Col>

                  <Col md={6}>
                    <Form.Label className="text-xs font-bold text-slate-700">Annual Performance Bonus (Optional)</Form.Label>
                    <InputGroup size="sm">
                      <InputGroup.Text className="bg-slate-100 font-bold text-xs">₹</InputGroup.Text>
                      <Form.Control
                        type="number"
                        placeholder="e.g. 50000"
                        value={form.annual_performance_bonus}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({ ...prev, annual_performance_bonus: val }));
                          recalculateLiveBreakdown(form.annual_ctc, val);
                        }}
                        className="font-bold text-xs rounded-e-xl"
                      />
                    </InputGroup>
                  </Col>

                  <Col md={6}>
                    <Form.Label className="text-xs font-bold text-slate-700">Proposed Date of Joining *</Form.Label>
                    <Form.Control
                      type="date"
                      size="sm"
                      value={form.joining_date}
                      onChange={(e) => setForm((prev) => ({ ...prev, joining_date: e.target.value }))}
                      className="rounded-xl text-xs font-semibold"
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="text-xs font-bold text-slate-700">Offer Expiry Date *</Form.Label>
                    <Form.Control
                      type="date"
                      size="sm"
                      value={form.offer_expiry_date}
                      onChange={(e) => setForm((prev) => ({ ...prev, offer_expiry_date: e.target.value }))}
                      className="rounded-xl text-xs font-semibold"
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="text-xs font-bold text-slate-700">Work Location</Form.Label>
                    <Form.Control
                      type="text"
                      size="sm"
                      value={form.work_location}
                      onChange={(e) => setForm((prev) => ({ ...prev, work_location: e.target.value }))}
                      placeholder="e.g. Kolkata HQ / Hybrid / Remote"
                      className="rounded-xl text-xs"
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="text-xs font-bold text-slate-700">Reporting Manager</Form.Label>
                    <Form.Control
                      type="text"
                      size="sm"
                      value={form.reporting_manager}
                      onChange={(e) => setForm((prev) => ({ ...prev, reporting_manager: e.target.value }))}
                      placeholder="e.g. VP - Engineering / Sid Nayak"
                      className="rounded-xl text-xs"
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label className="text-xs font-bold text-slate-700">Employment Type</Form.Label>
                    <Form.Select
                      size="sm"
                      value={form.employment_type}
                      onChange={(e) => setForm((prev) => ({ ...prev, employment_type: e.target.value }))}
                      className="rounded-xl text-xs"
                    >
                      <option value="Full Time (Probation)">Full Time (Probation)</option>
                      <option value="Full Time (Permanent)">Full Time (Permanent)</option>
                      <option value="Fixed Term Contract">Fixed Term Contract</option>
                      <option value="Graduate Intern">Graduate Intern</option>
                    </Form.Select>
                  </Col>

                  <Col md={4}>
                    <Form.Label className="text-xs font-bold text-slate-700">Probation (Months)</Form.Label>
                    <Form.Select
                      size="sm"
                      value={form.probation_period_months}
                      onChange={(e) => setForm((prev) => ({ ...prev, probation_period_months: e.target.value }))}
                      className="rounded-xl text-xs"
                    >
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months (Standard)</option>
                      <option value={0}>0 (Direct Confirmation)</option>
                    </Form.Select>
                  </Col>

                  <Col md={4}>
                    <Form.Label className="text-xs font-bold text-slate-700">Notice Period (Days)</Form.Label>
                    <Form.Select
                      size="sm"
                      value={form.notice_period_days}
                      onChange={(e) => setForm((prev) => ({ ...prev, notice_period_days: e.target.value }))}
                      className="rounded-xl text-xs"
                    >
                      <option value={15}>15 Days</option>
                      <option value={30}>30 Days (Standard)</option>
                      <option value={60}>60 Days</option>
                      <option value={90}>90 Days</option>
                    </Form.Select>
                  </Col>
                </Row>

                {/* Step 3: Live Salary Structure Card */}
                {liveBreakdown && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                        Annexure A: Live Salary Structure Preview
                      </span>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Monthly Gross: {formatINR(liveBreakdown.monthly_gross)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">Basic (50%)</span>
                        <span className="font-bold text-slate-800">{formatINR(liveBreakdown.monthly_basic)}/mo</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">HRA (40%)</span>
                        <span className="font-bold text-slate-800">{formatINR(liveBreakdown.monthly_hra)}/mo</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">Special Allowance</span>
                        <span className="font-bold text-slate-800">{formatINR(liveBreakdown.monthly_special_allowance)}/mo</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">Employer PF (Annual)</span>
                        <span className="font-bold text-slate-800">{formatINR(liveBreakdown.employer_pf_annual)}/yr</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submission Toggle */}
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">Route through Executive Approval Chain</span>
                    <span className="text-[11px] text-amber-800">
                      When checked, offer goes into HOD review → Management review before release.
                    </span>
                  </div>
                  <Form.Check
                    type="switch"
                    id="submit-approval-switch"
                    checked={form.submit_for_approval}
                    onChange={(e) => setForm((prev) => ({ ...prev, submit_for_approval: e.target.checked }))}
                    className="fs-5"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="light" size="sm" onClick={() => setShowCreateModal(false)} className="rounded-xl text-xs font-bold">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingOffer}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold px-4 flex items-center gap-1.5"
                  >
                    {submittingOffer ? (
                      <>
                        <Spinner animation="border" size="sm" /> Generating...
                      </>
                    ) : (
                      <>
                        <LuCheck className="w-4 h-4" /> {form.submit_for_approval ? "Submit for Approval" : "Save as Draft"}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </Form>
        </Modal.Body>
      </Modal>

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 2: APPROVAL WORKFLOW REVIEW (HOD / MANAGEMENT)     */}
      {/* ════════════════════════════════════════════════════════ */}
      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
            <LuShieldCheck className="text-amber-600 w-5 h-5" />
            <span>Offer Approval Review ({selectedOfferForAction?.current_approval_stage} Stage)</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedOfferForAction && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Candidate:</span>
                  <span className="font-bold text-slate-900">{selectedOfferForAction.candidate_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Position &amp; Dept:</span>
                  <span className="font-bold text-slate-800">{selectedOfferForAction.designation} ({selectedOfferForAction.department})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Proposed CTC:</span>
                  <span className="font-black text-emerald-700">{formatINR(selectedOfferForAction.annual_ctc)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Proposed Joining Date:</span>
                  <span className="font-bold text-slate-800">{formatDateStr(selectedOfferForAction.joining_date)}</span>
                </div>
              </div>

              {/* Decision Radio */}
              <div>
                <Form.Label className="text-xs font-bold text-slate-700 mb-1.5">Approval Decision</Form.Label>
                <div className="flex gap-4">
                  <Form.Check
                    type="radio"
                    id="decision-approve"
                    label="Approve &amp; Pass to Next Stage"
                    name="approvalDecision"
                    checked={approvalDecision === "APPROVED"}
                    onChange={() => setApprovalDecision("APPROVED")}
                    className="text-xs font-bold text-emerald-700"
                  />
                  <Form.Check
                    type="radio"
                    id="decision-reject"
                    label="Reject / Request Revision"
                    name="approvalDecision"
                    checked={approvalDecision === "REJECTED"}
                    onChange={() => setApprovalDecision("REJECTED")}
                    className="text-xs font-bold text-rose-700"
                  />
                </div>
              </div>

              {/* Comments */}
              <div>
                <Form.Label className="text-xs font-bold text-slate-700">Approver Comments</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Enter remarks, budget approval notes, or revision reasons..."
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="light" size="sm" onClick={() => setShowApproveModal(false)} className="rounded-xl text-xs font-bold">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleProcessApproval}
                  disabled={processingApproval}
                  className={`rounded-xl text-xs font-bold text-white px-4 ${
                    approvalDecision === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {processingApproval ? <Spinner animation="border" size="sm" /> : "Submit Decision"}
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 3: VIEW OFFER DETAILS & AUDIT TRAIL                 */}
      {/* ════════════════════════════════════════════════════════ */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
            <LuFileText className="text-indigo-600 w-5 h-5" />
            <span>Offer Dossier: {selectedOfferForView?.offer_code}</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3 max-h-[82vh] overflow-y-auto">
          {selectedOfferForView && (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Candidate</span>
                  <span className="font-extrabold text-slate-900">{selectedOfferForView.candidate_name}</span>
                  <span className="text-slate-500 text-[10px] block">{selectedOfferForView.candidate_email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Position &amp; Dept</span>
                  <span className="font-bold text-slate-800">{selectedOfferForView.designation}</span>
                  <span className="text-slate-500 text-[10px] block">{selectedOfferForView.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Annual CTC</span>
                  <span className="font-black text-emerald-700 text-sm">{formatINR(selectedOfferForView.annual_ctc)}</span>
                  <span className="text-slate-500 text-[10px] block">{formatINR(selectedOfferForView.monthly_gross)} / month</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Joining Date</span>
                  <span className="font-bold text-slate-900">{formatDateStr(selectedOfferForView.joining_date)}</span>
                  <span className="text-rose-600 text-[10px] block">Expiry: {formatDateStr(selectedOfferForView.offer_expiry_date)}</span>
                </div>
              </div>

              {/* Approval Chain Audit Trail */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide block">
                  Approval Chain Audit Trail
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* HOD Review */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">Stage 1: HOD Department Review</span>
                      <Badge bg={selectedOfferForView.hod_decision === "APPROVED" ? "success" : "secondary"}>
                        {selectedOfferForView.hod_decision}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Approver: {selectedOfferForView.hod_name || "Pending HOD"}
                    </div>
                    {selectedOfferForView.hod_comments && (
                      <div className="text-[11px] text-slate-500 italic mt-1">"{selectedOfferForView.hod_comments}"</div>
                    )}
                  </div>

                  {/* Management Review */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">Stage 2: Management / CEO Review</span>
                      <Badge bg={selectedOfferForView.management_decision === "APPROVED" ? "success" : "secondary"}>
                        {selectedOfferForView.management_decision}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Approver: {selectedOfferForView.management_name || "Pending Management"}
                    </div>
                    {selectedOfferForView.management_comments && (
                      <div className="text-[11px] text-slate-500 italic mt-1">"{selectedOfferForView.management_comments}"</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Digital Acceptance Status */}
              {selectedOfferForView.candidate_decision === "ACCEPTED" && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold">
                    <LuCircleCheck className="w-4 h-4 text-emerald-600" /> Candidate Digitally Accepted
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-emerald-900">
                    <div>
                      <span className="text-emerald-700 block">Digitally Signed By:</span>
                      <strong>{selectedOfferForView.candidate_signature_name}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block">Confirmed Joining Date:</span>
                      <strong>{formatDateStr(selectedOfferForView.candidate_confirmed_joining_date)}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block">Signed Timestamp:</span>
                      <strong>{formatDateStr(selectedOfferForView.candidate_decided_at)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions Footer */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => generateOfferLetterPDF(selectedOfferForView)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <LuDownload className="w-3.5 h-3.5" /> Download Offer Letter (PDF)
                </Button>
                {selectedOfferForView.acceptance_token && (
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => handleCopyLink(selectedOfferForView.acceptance_token)}
                    className="rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5"
                  >
                    <LuCopy className="w-3.5 h-3.5 text-slate-500" /> Copy Acceptance Link
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
