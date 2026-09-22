import React, { useState, useEffect, useId } from "react";
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Table, Tab, Nav, Spinner, ProgressBar } from "react-bootstrap";
import {
  LuStethoscope,
  LuShieldCheck,
  LuHeartPulse,
  LuHospital,
  LuFileText,
  LuUpload,
  LuDownload,
  LuClock,
  LuSearch,
  LuTrash2,
  LuPlus,
  LuUsers,
  LuFileSpreadsheet,
  LuPhoneCall,
  LuEye,
  LuExternalLink,
  LuRefreshCw,
  LuBuilding,
  LuCalendar,
  LuReceipt,
  LuCircleCheck,
  LuInfo,
} from "react-icons/lu";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import api, { getUploadUrl } from "../../api";
import Loader from "../../components/Loader/Loader";

// Mock Network Hospitals list for cashless assistance lookup
const NETWORK_HOSPITALS = [
  { id: 1, name: "Apollo Hospitals & Heart Centre", city: "Mumbai", area: "CBD Belapur", cashless: true, helpline: "+91 22 3350 3350", type: "Super Specialty" },
  { id: 2, name: "Fortis Hiranandani Hospital", city: "Navi Mumbai", area: "Vashi", cashless: true, helpline: "+91 22 3919 9222", type: "Multi Specialty" },
  { id: 3, name: "Kokilaben Dhirubhai Ambani Hospital", city: "Mumbai", area: "Andheri West", cashless: true, helpline: "+91 22 4269 6969", type: "Quaternary Care" },
  { id: 4, name: "Lilavati Hospital & Research Centre", city: "Mumbai", area: "Bandra West", cashless: true, helpline: "+91 22 2675 1000", type: "Multi Specialty" },
  { id: 5, name: "Manipal Hospital", city: "Bengaluru", area: "Old Airport Rd", cashless: true, helpline: "+91 80 2502 4444", type: "Multi Specialty" },
  { id: 6, name: "Max Super Specialty Hospital", city: "Delhi NCR", area: "Saket", cashless: true, helpline: "+91 11 2651 5050", type: "Super Specialty" },
  { id: 7, name: "Medanta - The Medicity", city: "Gurugram", area: "Sector 38", cashless: true, helpline: "+91 124 414 1414", type: "Multi Specialty" },
  { id: 8, name: "IRIS MULTISPECIALITY HOSPITAL", city: "Kolkata", area: "Vidyasagar Colony", cashless: true, helpline: "+91 124 414 1414", type: "Multi Specialty" },
];

export default function Mediclaim() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("card");
  const [policy, setPolicy] = useState(null);
  const [claims, setClaims] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [summary, setSummary] = useState(null);

  // User role
  const userRole = (localStorage.getItem("role") || "employee").toLowerCase();
  const isHRorAdmin = ["hr", "admin", "accounts", "payroll"].includes(userRole);

  // Health Card Flip State
  const [cardFlipped, setCardFlipped] = useState(false);

  // Add Dependent Modal State
  const [showAddDepModal, setShowAddDepModal] = useState(false);
  const [depForm, setDepForm] = useState({
    name: "",
    relation: "Spouse",
    dob: "",
    gender: "Female",
    blood_group: "O+",
  });
  const [savingDep, setSavingDep] = useState(false);

  // Nominee Edit Modal
  const [showNomineeModal, setShowNomineeModal] = useState(false);
  const [nomineeForm, setNomineeForm] = useState({
    nominee_name: "",
    nominee_relation: "",
    nominee_contact: "",
  });

  // Submit Claim Form State
  const [claimForm, setClaimForm] = useState({
    patient_name: "",
    patient_relation: "Self",
    hospital_name: "",
    hospital_city: "",
    hospital_type: "Network (Cashless)",
    admission_date: "",
    discharge_date: "",
    ailment_diagnosis: "",
    treatment_type: "Inpatient Hospitalization",
    claimed_amount: "",
    remarks: "",
  });
  const [attachedDocs, setAttachedDocs] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docCategory, setDocCategory] = useState("Hospital Final Bill");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Claim Details / Documents Preview Modal
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showClaimDetailsModal, setShowClaimDetailsModal] = useState(false);

  // HR / Admin Company Desk State
  const [companyClaims, setCompanyClaims] = useState([]);
  const [loadingCompanyClaims, setLoadingCompanyClaims] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companyStatusFilter, setCompanyStatusFilter] = useState("All");
  const [companyDeptFilter, setCompanyDeptFilter] = useState("All");

  // HR Review Modal State
  const [reviewingClaim, setReviewingClaim] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    status: "Approved",
    approved_amount: "",
    settled_amount: "",
    settlement_ref: "",
    hr_remarks: "",
  });
  const [savingReview, setSavingReview] = useState(false);

  // Network Hospital Search
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [hospitalCity, setHospitalCity] = useState("All");

  // Fetch my mediclaim details
  const fetchMyMediclaim = async () => {
    try {
      setLoading(true);
      const res = await api.get("/mediclaim/my");
      if (res.data?.success) {
        setPolicy(res.data.policy);
        setClaims(res.data.claims || []);
        setEmployee(res.data.employee);
        setSummary(res.data.summary);

        // Pre-fill default claim patient
        if (res.data.employee?.name && !claimForm.patient_name) {
          setClaimForm((prev) => ({
            ...prev,
            patient_name: res.data.employee.name,
            patient_relation: "Self",
          }));
        }

        // Pre-fill nominee
        if (res.data.policy) {
          setNomineeForm({
            nominee_name: res.data.policy.nominee_name || "",
            nominee_relation: res.data.policy.nominee_relation || "",
            nominee_contact: res.data.policy.nominee_contact || "",
          });
        }
      }
    } catch (err) {
      console.error("Error fetching mediclaim:", err);
      toast.error("Failed to load mediclaim details");
    } finally {
      setLoading(false);
    }
  };

  // Fetch company claims for HR/Admin
  const fetchCompanyClaims = async () => {
    if (!isHRorAdmin) return;
    try {
      setLoadingCompanyClaims(true);
      const params = {};
      if (companyStatusFilter !== "All") params.status = companyStatusFilter;
      if (companyDeptFilter !== "All") params.dept = companyDeptFilter;
      if (companySearch) params.search = companySearch;

      const res = await api.get("/mediclaim/all-claims", { params });
      if (res.data?.success) {
        setCompanyClaims(res.data.claims || []);
      }
    } catch (err) {
      console.error("Error fetching company claims:", err);
      toast.error("Failed to load company claims");
    } finally {
      setLoadingCompanyClaims(false);
    }
  };

  useEffect(() => {
    fetchMyMediclaim();
  }, []);

  useEffect(() => {
    if (activeTab === "company_desk" && isHRorAdmin) {
      fetchCompanyClaims();
    }
  }, [activeTab, companyStatusFilter, companyDeptFilter]);

  // Handle Add Dependent
  const handleAddDependent = async (e) => {
    e.preventDefault();
    if (!depForm.name.trim() || !depForm.dob) {
      toast.error("Please fill in dependent name and birth date");
      return;
    }

    try {
      setSavingDep(true);
      const currentDeps = Array.isArray(policy?.enrolled_dependents) ? [...policy.enrolled_dependents] : [];

      // Calculate approximate age
      const birthYear = new Date(depForm.dob).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = Math.max(0, currentYear - birthYear);

      const cleanEmpId = (employee?.employee_id || "EMP").replace(/\D/g, "");
      const newDepItem = {
        id: `dep_${Date.now()}`,
        name: depForm.name.trim(),
        relation: depForm.relation,
        dob: depForm.dob,
        age,
        gender: depForm.gender,
        blood_group: depForm.blood_group,
        tpa_member_id: `MED-ZEN-${cleanEmpId || "782"}-${currentDeps.length + 1}`,
      };

      const updatedDeps = [...currentDeps, newDepItem];

      const res = await api.post("/mediclaim/dependents", {
        enrolled_dependents: updatedDeps,
      });

      if (res.data?.success) {
        toast.success(`Dependent "${depForm.name}" enrolled successfully!`);
        setShowAddDepModal(false);
        setDepForm({
          name: "",
          relation: "Spouse",
          dob: "",
          gender: "Female",
          blood_group: "O+",
        });
        fetchMyMediclaim();
      }
    } catch (err) {
      console.error("Error saving dependent:", err);
      toast.error("Failed to add dependent");
    } finally {
      setSavingDep(false);
    }
  };

  // Handle Remove Dependent
  const handleRemoveDependent = async (depId) => {
    if (!window.confirm("Are you sure you want to remove this enrolled dependent?")) return;

    try {
      const currentDeps = policy?.enrolled_dependents || [];
      const updatedDeps = currentDeps.filter((d) => d.id !== depId);

      const res = await api.post("/mediclaim/dependents", {
        enrolled_dependents: updatedDeps,
      });

      if (res.data?.success) {
        toast.success("Dependent removed successfully");
        fetchMyMediclaim();
      }
    } catch (err) {
      console.error("Error removing dependent:", err);
      toast.error("Failed to remove dependent");
    }
  };

  // Handle Nominee Save
  const handleSaveNominee = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/mediclaim/dependents", nomineeForm);
      if (res.data?.success) {
        toast.success("Nominee details updated successfully");
        setShowNomineeModal(false);
        fetchMyMediclaim();
      }
    } catch (err) {
      console.error("Error saving nominee:", err);
      toast.error("Failed to update nominee");
    }
  };

  // Handle Document Upload for Claim
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (<10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Document size exceeds 10MB limit");
      return;
    }

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append("doc_file", file);
      formData.append("category", docCategory);

      const res = await api.post("/mediclaim/upload-doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data.document) {
        setAttachedDocs((prev) => [...prev, res.data.document]);
        toast.success(`Attached "${file.name}" (${docCategory})`);
        // Reset file input
        e.target.value = "";
      }
    } catch (err) {
      console.error("Error uploading document:", err);
      toast.error("Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Remove attached document before submission
  const handleRemoveAttachedDoc = (docId) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  // Handle Claim Submission
  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!claimForm.patient_name || !claimForm.hospital_name || !claimForm.hospital_city || !claimForm.admission_date || !claimForm.discharge_date || !claimForm.ailment_diagnosis || !claimForm.claimed_amount) {
      toast.error("Please fill in all required fields marked with *");
      return;
    }

    if (attachedDocs.length === 0) {
      if (!window.confirm("You have not attached any supporting documents (Hospital bills, discharge summary, etc.). Do you still want to proceed?")) {
        return;
      }
    }

    try {
      setSubmittingClaim(true);
      const payload = {
        ...claimForm,
        claimed_amount: parseFloat(claimForm.claimed_amount),
        supporting_documents: attachedDocs,
      };

      const res = await api.post("/mediclaim/claim/submit", payload);

      if (res.data?.success) {
        toast.success(res.data.message || "Claim submitted successfully!");
        setClaimForm({
          patient_name: employee?.name || "",
          patient_relation: "Self",
          hospital_name: "",
          hospital_city: "",
          hospital_type: "Network (Cashless)",
          admission_date: "",
          discharge_date: "",
          ailment_diagnosis: "",
          treatment_type: "Inpatient Hospitalization",
          claimed_amount: "",
          remarks: "",
        });
        setAttachedDocs([]);
        fetchMyMediclaim();
        setActiveTab("my_claims");
      }
    } catch (err) {
      console.error("Error submitting claim:", err);
      toast.error(err.response?.data?.error || "Failed to submit claim");
    } finally {
      setSubmittingClaim(false);
    }
  };

  // Handle Cancel Claim (Employee)
  const handleCancelClaim = async (claimId) => {
    if (!window.confirm("Are you sure you want to withdraw this claim?")) return;
    try {
      const res = await api.delete(`/mediclaim/claim/${claimId}/cancel`);
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchMyMediclaim();
      }
    } catch (err) {
      console.error("Error cancelling claim:", err);
      toast.error(err.response?.data?.error || "Failed to cancel claim");
    }
  };

  // Handle HR Open Review Modal
  const handleOpenReviewModal = (claim) => {
    setReviewingClaim(claim);
    setReviewForm({
      status: claim.status === "Submitted" ? "Under Review" : claim.status,
      approved_amount: claim.approved_amount !== null && claim.approved_amount !== undefined ? claim.approved_amount : claim.claimed_amount,
      settled_amount: claim.settled_amount || "",
      settlement_ref: claim.settlement_ref || "",
      hr_remarks: claim.hr_remarks || "",
    });
    setShowReviewModal(true);
  };

  // Handle HR Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewingClaim) return;

    try {
      setSavingReview(true);
      const res = await api.patch(`/mediclaim/claim/${reviewingClaim.id}/review`, reviewForm);
      if (res.data?.success) {
        toast.success(res.data.message || "Claim reviewed successfully");
        setShowReviewModal(false);
        fetchCompanyClaims();
        fetchMyMediclaim();
      }
    } catch (err) {
      console.error("Error reviewing claim:", err);
      toast.error(err.response?.data?.error || "Failed to update claim");
    } finally {
      setSavingReview(false);
    }
  };

  // Export Claims to Excel
  const handleExportClaimsExcel = () => {
    const dataToExport = (companyClaims.length > 0 ? companyClaims : claims).map((c) => ({
      "Claim ID": c.claim_number,
      "Employee ID": c.employee_id,
      "Employee Name": c.employee_name,
      "Department": c.dept,
      "Patient Name": c.patient_name,
      "Relation": c.patient_relation,
      "Hospital Name": c.hospital_name,
      "City": c.hospital_city,
      "Ailment / Diagnosis": c.ailment_diagnosis,
      "Treatment Type": c.treatment_type,
      "Admission Date": c.admission_date,
      "Discharge Date": c.discharge_date,
      "Claimed Amount (INR)": c.claimed_amount,
      "Approved Amount (INR)": c.approved_amount || "Pending",
      "Settled Amount (INR)": c.settled_amount || "Pending",
      "Status": c.status,
      "Settlement Ref": c.settlement_ref || "—",
      "Attached Docs Count": c.supporting_documents?.length || 0,
      "HR Remarks": c.hr_remarks || "—",
      "Submission Date": c.submission_date ? new Date(c.submission_date).toLocaleDateString() : "—",
    }));

    if (dataToExport.length === 0) {
      toast.error("No claim records found to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mediclaim Claims");
    XLSX.writeFile(wb, `Mediclaim_Claims_Register_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel report exported successfully!");
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return <Badge bg="success" className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-emerald-600">Approved</Badge>;
      case "Settled":
        return <Badge bg="primary" className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-blue-600">Settled</Badge>;
      case "Under Review":
      case "In Review":
        return <Badge bg="warning" text="dark" className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-amber-400">Under Review</Badge>;
      case "Documents Verified":
        return <Badge bg="info" className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-cyan-600">Docs Verified</Badge>;
      case "Query Raised":
        return <Badge bg="warning" text="dark" className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-orange-400">Query Raised</Badge>;
      case "Rejected":
        return <Badge bg="danger" className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-rose-600">Rejected</Badge>;
      case "Withdrawn":
        return <Badge bg="secondary" className="px-2.5 py-1 text-xs font-semibold rounded-pill">Withdrawn</Badge>;
      default:
        return <Badge bg="primary" className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-indigo-600">{status || "Submitted"}</Badge>;
    }
  };

  // Filtered Network Hospitals
  const filteredHospitals = NETWORK_HOSPITALS.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) || h.area.toLowerCase().includes(hospitalSearch.toLowerCase());
    const matchesCity = hospitalCity === "All" || h.city === hospitalCity;
    return matchesSearch && matchesCity;
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
        <Loader />
      </div>
    );
  }

  const enrolledDeps = policy?.enrolled_dependents || [];
  const percentCovered = summary?.sum_insured > 0 ? Math.min(100, Math.round((summary.total_approved / summary.sum_insured) * 100)) : 0;

  return (
    <Container fluid className="px-4 py-4 max-w-6xl" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* HEADER SECTION */}
      <div className="mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-rose-50 text-rose-600 d-inline-flex align-items-center justify-content-center shadow-2xs">
                <LuStethoscope size={24} />
              </span>
              <h2 className="fw-bold text-slate-900 m-0 text-2xl tracking-tight">
                Mediclaim & Health Insurance Hub
              </h2>
            </div>
            <p className="text-slate-500 m-0 text-sm">
              Corporate Group Health Insurance (GHI) & Cashless Hospitalization Coverage for you and your family.
            </p>
          </div>

          {/* Quick Help Desk & Status Badge */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-2xs d-flex align-items-center gap-2 text-xs text-slate-600">
              <LuPhoneCall className="text-rose-600 animate-pulse" size={16} />
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">24x7 TPA Emergency Helpline</span>
                <span className="font-bold text-slate-800">{policy?.emergency_helpline || "1800-425-9449"}</span>
              </div>
            </div>

            <Button
              variant="outline-secondary"
              size="sm"
              onClick={fetchMyMediclaim}
              className="d-flex align-items-center gap-1.5 rounded-lg py-2 px-3 text-xs bg-white shadow-2xs"
            >
              <LuRefreshCw size={14} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* TOP METRIC CARDS ROW */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Sum Insured */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-2xl p-4 bg-white h-100 position-relative overflow-hidden">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Health Coverage</span>
                <h3 className="fw-bold text-slate-900 m-0 mt-1 text-2xl">
                  ₹{(summary?.sum_insured || 500000).toLocaleString("en-IN")}
                </h3>
                <span className="text-xs text-emerald-600 font-medium d-inline-flex align-items-center gap-1 mt-1">
                  <LuShieldCheck size={14} /> {policy?.plan_type || "Group Floater (1+3)"}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                <LuShieldCheck size={24} />
              </div>
            </div>
            <div className="mt-3 pt-2 border-top border-slate-100 d-flex justify-content-between text-[11px] text-slate-500">
              <span>Policy: {policy?.policy_number}</span>
              <span className="text-emerald-700 font-bold">Active</span>
            </div>
          </Card>
        </Col>

        {/* Card 2: Remaining Coverage Balance */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-2xl p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Remaining Balance</span>
                <h3 className="fw-bold text-emerald-600 m-0 mt-1 text-2xl">
                  ₹{(summary?.remaining_coverage || 500000).toLocaleString("en-IN")}
                </h3>
                <span className="text-xs text-slate-500 mt-1 block">
                  Available for cashless or reimbursement
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                <LuHeartPulse size={24} />
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar
                now={100 - percentCovered}
                variant={percentCovered > 80 ? "danger" : percentCovered > 40 ? "warning" : "success"}
                style={{ height: "6px" }}
                className="rounded-pill"
              />
            </div>
          </Card>
        </Col>

        {/* Card 3: Utilized / Settled Amount */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-2xl p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Utilized Claims</span>
                <h3 className="fw-bold text-slate-900 m-0 mt-1 text-2xl">
                  ₹{(summary?.total_approved || 0).toLocaleString("en-IN")}
                </h3>
                <span className="text-xs text-slate-400 mt-1 block">
                  Total Claimed: ₹{(summary?.total_claimed || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
                <LuReceipt size={24} />
              </div>
            </div>
            <div className="mt-3 pt-2 border-top border-slate-100 d-flex justify-content-between text-[11px] text-slate-500">
              <span>Settled: ₹{(summary?.total_settled || 0).toLocaleString("en-IN")}</span>
              <span>{claims.length} claim(s) filed</span>
            </div>
          </Card>
        </Col>

        {/* Card 4: Covered Lives & Nominee */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-2xl p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Covered Beneficiaries</span>
                <h3 className="fw-bold text-slate-900 m-0 mt-1 text-2xl">
                  {1 + enrolledDeps.length} <span className="text-sm font-normal text-slate-400">Lives</span>
                </h3>
                <span className="text-xs text-indigo-600 font-medium mt-1 block">
                  Self + {enrolledDeps.length} Dependent(s)
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <LuUsers size={24} />
              </div>
            </div>
            <div className="mt-3 pt-2 border-top border-slate-100 d-flex justify-content-between align-items-center text-[11px] text-slate-500">
              <span>Nominee: {policy?.nominee_name || "Not assigned"}</span>
              <button
                onClick={() => setShowNomineeModal(true)}
                className="text-indigo-600 font-semibold text-xs border-0 bg-transparent p-0 hover:underline"
              >
                Edit
              </button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* NAVIGATION TABS */}
      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <div className="bg-white rounded-2xl p-2 shadow-sm text-sm border border-slate-200 mb-4">
          <Nav variant="pills" className="d-flex flex-nowrap gap-1">
            <Nav.Item>
              <Nav.Link eventKey="card" className="d-flex align-items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer">
                <LuShieldCheck size={16} /> Digital E-Card & Policy
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="dependents" className="d-flex align-items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer">
                <LuUsers size={16} /> Covered Family ({1 + enrolledDeps.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="submit_claim" className="d-flex align-items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer">
                <LuPlus size={16} /> Submit New Claim
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="my_claims" className="d-flex align-items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer">
                <LuFileText size={16} /> My Claims & Timeline ({claims.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="network_hospitals" className="d-flex align-items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer">
                <LuHospital size={16} /> Cashless Network Hospitals
              </Nav.Link>
            </Nav.Item>

            {/* HR / Admin Review Desk Tab (Only shown to HR/Admin roles) */}
            {isHRorAdmin && (
              <Nav.Item className="ms-md-auto">
                <Nav.Link
                  eventKey="company_desk"
                  className="d-flex align-items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer bg-slate-900 text-white"
                >
                  <LuFileSpreadsheet size={16} className="text-emerald-400" />
                  Company Claims Desk
                  {companyClaims.filter((c) => ["Submitted", "Under Review"].includes(c.status)).length > 0 && (
                    <span className="badge bg-rose-500 rounded-pill text-[10px]">
                      {companyClaims.filter((c) => ["Submitted", "Under Review"].includes(c.status)).length}
                    </span>
                  )}
                </Nav.Link>
              </Nav.Item>
            )}
          </Nav>
        </div>

        <Tab.Content>
          {/* TAB 1: DIGITAL E-CARD & POLICY DETAILS */}
          <Tab.Pane eventKey="card">
            <Row className="g-4">
              {/* Left Column: Physical-style Digital Health Card */}
              <Col xs={12} lg={6}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold text-slate-800 m-0 text-base d-flex align-items-center gap-2">
                    <LuShieldCheck className="text-emerald-600" /> Corporate Health Card (E-Card)
                  </h5>
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setCardFlipped(!cardFlipped)}
                      className="rounded-lg text-xs py-1 px-1.5"
                    >
                      {cardFlipped ? "Show Front" : "Show Back"}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => window.print()}
                      className="rounded-lg text-xs py-1.5 px-2.5 d-flex align-items-center gap-1 bg-blue-600"
                    >
                      {/* <LuDownload size={13} />  */}
                      Print / Save E-Card
                    </Button>
                  </div>
                </div>

                {/* E-Card Container */}
                <div
                  className="rounded-3xl p-4 text-white position-relative shadow-lg overflow-hidden transition-all duration-300"
                  style={{
                    background: cardFlipped
                      ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
                      : "linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0c4a6e 100%)",
                    minHeight: "260px",
                  }}
                >
                  {/* Watermark Logo */}
                  <div
                    className="position-absolute"
                    style={{
                      right: "-20px",
                      bottom: "-20px",
                      opacity: 0.08,
                      fontSize: "140px",
                      lineHeight: "1",
                      pointerEvents: "none",
                    }}
                  >
                    🏥
                  </div>

                  {!cardFlipped ? (
                    /* Front Side */
                    <div className="d-flex flex-column justify-content-between h-100">
                      {/* Card Top Header */}
                      <div className="d-flex justify-content-between align-items-start border-b border-white/20 pb-3">
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-black tracking-wider text-sm text-white">ZENTELEX</span>
                            <Badge bg="light" text="dark" className="text-[10px] font-bold rounded-pill px-2">
                              CORPORATE HEALTH
                            </Badge>
                          </div>
                          <span className="text-[11px] text-sky-100 opacity-90 block mt-0.5">
                            Group Mediclaim Policy
                          </span>
                        </div>
                        <div className="text-end">
                          <span className="text-[10px] uppercase tracking-widest text-sky-200 block font-semibold">TPA Partner</span>
                          <span className="fw-bold text-xs text-white">Medi Assist TPA</span>
                        </div>
                      </div>

                      {/* Card Middle: Member details */}
                      <div className="my-4">
                        <div className="d-flex align-items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md d-flex align-items-center justify-content-center text-xl font-bold border border-white/30 text-white">
                            {employee?.name ? employee.name.charAt(0) : "E"}
                          </div>
                          <div>
                            <span className="text-[11px] text-sky-200 block uppercase tracking-wider font-semibold">Primary Insured Employee</span>
                            <h4 className="fw-bold text-white m-0 text-lg leading-tight">{employee?.name || "Employee"}</h4>
                            <span className="text-xs text-sky-100">
                              ID: <strong className="text-white">{employee?.employee_id}</strong> &nbsp;|&nbsp; Dept: {employee?.dept} &nbsp;|&nbsp; Blood: <strong className="text-white">{employee?.blood_group || "O+"}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom: Member ID, Sum Insured & Validity */}
                      <div className="border-t border-white/20 pt-3 d-flex justify-content-between align-items-end text-xs">
                        <div>
                          <span className="text-[10px] text-sky-200 block uppercase">Policy No / Member ID</span>
                          <span className="font-mono font-bold text-white text-xs">{policy?.policy_number}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-sky-200 block uppercase">Sum Insured</span>
                          <span className="font-bold text-white">₹{(policy?.sum_insured || 500000).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="text-end">
                          <span className="text-[10px] text-sky-200 block uppercase">Validity</span>
                          <span className="font-semibold text-sky-100">{policy?.policy_start_date} to {policy?.policy_end_date}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Back Side */
                    <div className="d-flex flex-column justify-content-between h-100 text-xs">
                      <div>
                        <div className="d-flex justify-content-between align-items-center border-b border-white/10 pb-2 mb-2">
                          <span className="font-bold text-white uppercase tracking-wider text-[11px]">Enrolled Dependents ({enrolledDeps.length})</span>
                          <span className="text-[10px] text-slate-400">Cashless Available at Network Hospitals</span>
                        </div>

                        {enrolledDeps.length === 0 ? (
                          <p className="text-slate-400 text-center py-4 m-0 text-xs">
                            No dependents added yet. Click &apos;Covered Family&apos; tab to enroll your spouse, children, or parents.
                          </p>
                        ) : (
                          <div className="d-flex flex-column gap-1.5 overflow-y-auto" style={{ maxHeight: "140px" }}>
                            {enrolledDeps.map((dep, idx) => (
                              <div key={idx} className="d-flex justify-content-between align-items-center bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                                <div>
                                  <strong className="text-white text-xs">{dep.name}</strong>
                                  <span className="text-[10px] text-slate-400 ms-2">({dep.relation}, {dep.age || "--"}y)</span>
                                </div>
                                <span className="text-[10px] font-mono text-sky-300">{dep.tpa_member_id || "--"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Cashless Instructions on Back */}
                      <div className="border-t border-white/10 pt-2 text-[10px] text-slate-400 d-flex justify-content-between align-items-center">
                        <div>
                          <span>Claims: <strong>{policy?.tpa_email || "claims@mediassist.in"}</strong></span>
                          <span className="d-block text-[9px] text-slate-500">Produce this E-card + Govt Photo ID at the hospital TPA desk.</span>
                        </div>
                        <div className="text-end">
                          <span className="text-emerald-400 font-bold">24x7 Cashless</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 bg-white p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 d-flex align-items-center gap-3 shadow-2xs">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <LuInfo size={18} />
                  </span>
                  <div>
                    <span className="fw-bold text-slate-800 d-block">Cashless Hospitalization Tip</span>
                    Inform the hospital TPA desk at least 48 hours in advance for planned hospitalizations, or within 24 hours in emergency cases.
                  </div>
                </div>
              </Col>

              {/* Right Column: Policy Benefits Matrix */}
              <Col xs={12} lg={6}>
                <h5 className="fw-bold text-slate-800 mb-3 text-base d-flex align-items-center gap-2">
                  <LuCircleCheck className="text-blue-600" /> Coverage Highlights & Inclusions
                </h5>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-start gap-3 pb-3 border-b border-slate-100">
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 mt-0.5">
                        <LuBuilding size={16} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <strong className="text-xs text-slate-800">In-Patient Hospitalization</strong>
                          <span className="badge bg-emerald-500 text-emerald-800 text-[10px]">100% Covered</span>
                        </div>
                        <p className="text-slate-500 text-xs m-0 mt-0.5">
                          Boarding, nursing care, doctor visits, medicines, oxygen, blood, surgical appliances up to the sum insured.
                        </p>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 pb-3 border-b border-slate-100">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600 mt-0.5">
                        <LuCalendar size={16} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <strong className="text-xs text-slate-800">Pre & Post Hospitalization</strong>
                          <span className="badge bg-blue-500 text-blue-800 text-[10px]">30 & 60 Days</span>
                        </div>
                        <p className="text-slate-500 text-xs m-0 mt-0.5">
                          Medical expenses incurred 30 days before admission and up to 60 days post-discharge (consultations, scans, tests).
                        </p>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 pb-3 border-b border-slate-100">
                      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 mt-0.5">
                        <LuStethoscope size={16} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <strong className="text-xs text-slate-800">Day Care Treatments (500+ procedures)</strong>
                          <span className="badge bg-indigo-500 text-indigo-800 text-[10px]">Included</span>
                        </div>
                        <p className="text-slate-500 text-xs m-0 mt-0.5">
                          Procedures requiring less than 24h hospitalization due to advanced technology (Cataract, Dialysis, Chemotherapy, Radiotherapy).
                        </p>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3 pb-3 border-b border-slate-100">
                      <div className="p-2 rounded-xl bg-rose-50 text-rose-600 mt-0.5">
                        <LuHeartPulse size={16} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <strong className="text-xs text-slate-800">Maternity & Newborn Cover</strong>
                          <span className="badge bg-rose-400 text-rose-800 text-[10px]">Up to ₹75,000</span>
                        </div>
                        <p className="text-slate-500 text-xs m-0 mt-0.5">
                          Normal delivery up to ₹50,000 and Caesarean (C-section) up to ₹75,000. Newborn baby covered from Day 1.
                        </p>
                      </div>
                    </div>

                    <div className="d-flex align-items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-600 mt-0.5">
                        <LuShieldCheck size={16} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <strong className="text-xs text-slate-800">Room Rent & ICU Limits</strong>
                          <span className="badge bg-amber-400 text-amber-800 text-[10px]">Single Private / No ICU Cap</span>
                        </div>
                        <p className="text-slate-500 text-xs m-0 mt-0.5">
                          Single private A/C room allowed or 1% of Sum Insured per day. ICU charges covered without sub-limits.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Tab.Pane>

          {/* TAB 2: COVERED FAMILY DEPENDENTS */}
          <Tab.Pane eventKey="dependents">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold text-slate-800 m-0 text-base">Enrolled Beneficiaries & Family Dependents</h5>
                <p className="text-slate-500 text-xs m-0">Group Floater covers Self, Spouse, up to 2 Children, and Dependent Parents.</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddDepModal(true)}
                className="d-flex align-items-center gap-1.5 rounded-xl text-xs py-2 px-3 bg-blue-600"
              >
                <LuPlus size={15} /> Add Family Dependent
              </Button>
            </div>

            <Row className="g-3">
              {/* Primary Insured Card */}
              <Col xs={12} md={6} lg={4}>
                <Card className="border-0 shadow-sm rounded-2xl p-4 bg-white border-start border-primary border-4 h-100">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <Badge bg="primary" className="mb-2 text-[10px] font-semibold rounded-pill">
                        Primary Insured (Self)
                      </Badge>
                      <h5 className="fw-bold text-slate-900 m-0 text-base">{employee?.name || "Employee"}</h5>
                      <span className="text-xs text-slate-400 d-block mt-0.5">ID: {employee?.employee_id}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <LuShieldCheck size={20} />
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-top border-slate-100 text-xs text-slate-600 d-flex flex-column gap-1">
                    <div className="d-flex justify-content-between">
                      <span className="text-slate-400">Department:</span>
                      <strong className="text-slate-800">{employee?.dept}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-slate-400">Blood Group:</span>
                      <strong className="text-slate-800">{employee?.blood_group || "O+"}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-slate-400">TPA Card ID:</span>
                      <strong className="font-mono text-slate-800">{policy?.policy_number}-01</strong>
                    </div>
                  </div>
                </Card>
              </Col>

              {/* Dependent Cards */}
              {enrolledDeps.map((dep, index) => (
                <Col xs={12} md={6} lg={4} key={dep.id || index}>
                  <Card className="border-0 shadow-sm rounded-2xl p-4 bg-white h-100">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <Badge bg="info" className="mb-2 text-[10px] font-semibold rounded-pill bg-cyan-600">
                          {dep.relation}
                        </Badge>
                        <h5 className="fw-bold text-slate-900 m-0 text-base">{dep.name}</h5>
                        <span className="text-xs text-slate-400 d-block mt-0.5">
                          Age: {dep.age || "--"} yrs &nbsp;|&nbsp; Gender: {dep.gender}
                        </span>
                      </div>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveDependent(dep.id)}
                        className="rounded-lg p-1.5 border-0 text-rose-500 hover:bg-rose-50"
                        title="Remove dependent"
                      >
                        <LuTrash2 size={15} />
                      </Button>
                    </div>

                    <div className="mt-3 pt-3 border-top border-slate-100 text-xs text-slate-600 d-flex flex-column gap-1">
                      <div className="d-flex justify-content-between">
                        <span className="text-slate-400">Date of Birth:</span>
                        <strong className="text-slate-800">{dep.dob || "—"}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-slate-400">Blood Group:</span>
                        <strong className="text-slate-800">{dep.blood_group || "—"}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-slate-400">TPA Member ID:</span>
                        <strong className="font-mono text-slate-800">{dep.tpa_member_id || "--"}</strong>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}

              {/* Empty placeholder card to add more */}
              <Col xs={12} md={6} lg={4}>
                <div
                  onClick={() => setShowAddDepModal(true)}
                  className="rounded-2xl border-2 border-dashed border-slate-200 p-4 h-100 d-flex flex-column align-items-center justify-content-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all"
                  style={{ minHeight: "180px" }}
                >
                  <div className="p-3 rounded-full bg-slate-100 text-slate-500 mb-2">
                    <LuPlus size={22} />
                  </div>
                  <strong className="text-xs text-slate-700">Add Another Dependent</strong>
                  <span className="text-[11px] text-slate-400 mt-0.5">Spouse, Child, or Parent</span>
                </div>
              </Col>
            </Row>

            {/* Nominee Details Section */}
            <div className="mt-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Policy Nominee</span>
                <h5 className="fw-bold text-slate-900 m-0 text-base">
                  {policy?.nominee_name ? `${policy.nominee_name} (${policy.nominee_relation || "Nominee"})` : "No Nominee Configured"}
                </h5>
                <span className="text-xs text-slate-500">Contact: {policy?.nominee_contact || "Not provided"}</span>
              </div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowNomineeModal(true)}
                className="rounded-xl text-xs py-2 px-3"
              >
                Update Nominee Details
              </Button>
            </div>
          </Tab.Pane>

          {/* TAB 3: SUBMIT NEW CLAIM WITH SUPPORTING DOCUMENTS */}
          <Tab.Pane eventKey="submit_claim">
            <Row className="g-4 justify-content-center">
              <Col xs={12} lg={10}>
                <Card className="border-0 shadow-sm rounded-3xl p-4 p-md-5 bg-white">
                  <div className="border-b border-slate-200 pb-3 mb-4">
                    <div className="d-flex align-items-center gap-2 text-rose-600 mb-1">
                      <LuStethoscope size={22} />
                      <h4 className="fw-bold text-slate-900 m-0 text-xl">File a New Mediclaim Claim</h4>
                    </div>
                    <p className="text-slate-500 text-xs m-0">
                      Submit for cashless intimation or reimbursement for hospitalization, surgeries, or day care procedures.
                    </p>
                  </div>

                  <Form onSubmit={handleSubmitClaim}>
                    <Row className="g-3">
                      {/* Section 1: Patient Selection */}
                      <Col xs={12} md={6}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">Patient Name *</Form.Label>
                          <Form.Select
                            value={claimForm.patient_name}
                            onChange={(e) => {
                              const selectedName = e.target.value;
                              let rel = "Self";
                              if (selectedName !== employee?.name) {
                                const found = enrolledDeps.find((d) => d.name === selectedName);
                                if (found) rel = found.relation;
                              }
                              setClaimForm({ ...claimForm, patient_name: selectedName, patient_relation: rel });
                            }}
                            className="rounded-xl text-xs py-2.5"
                            required
                          >
                            <option value={employee?.name || "Self"}>{employee?.name || "Self"} (Self - Employee)</option>
                            {enrolledDeps.map((dep, i) => (
                              <option key={i} value={dep.name}>
                                {dep.name} ({dep.relation})
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      <Col xs={12} md={6}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">Relationship *</Form.Label>
                          <Form.Control
                            type="text"
                            value={claimForm.patient_relation}
                            readOnly
                            className="rounded-xl text-xs py-2.5 bg-slate-50 text-slate-500"
                          />
                        </Form.Group>
                      </Col>

                      {/* Section 2: Hospital & Location */}
                      <Col xs={12} md={6}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">Hospital / Medical Centre Name *</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="e.g. Apollo Hospital / Fortis Healthcare"
                            value={claimForm.hospital_name}
                            onChange={(e) => setClaimForm({ ...claimForm, hospital_name: e.target.value })}
                            className="rounded-xl text-xs py-2.5"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col xs={12} md={3}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">City / Location *</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="e.g. Mumbai, Navi Mumbai"
                            value={claimForm.hospital_city}
                            onChange={(e) => setClaimForm({ ...claimForm, hospital_city: e.target.value })}
                            className="rounded-xl text-xs py-2.5"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col xs={12} md={3}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">Hospital Type *</Form.Label>
                          <Form.Select
                            value={claimForm.hospital_type}
                            onChange={(e) => setClaimForm({ ...claimForm, hospital_type: e.target.value })}
                            className="rounded-xl text-xs py-2.5"
                          >
                            <option value="Network (Cashless)">Network Hospital (Cashless)</option>
                            <option value="Non-Network (Reimbursement)">Non-Network (Reimbursement)</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      {/* Section 3: Hospitalization Dates */}
                      <Col xs={12} md={3}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">Admission Date *</Form.Label>
                          <Form.Control
                            type="date"
                            value={claimForm.admission_date}
                            onChange={(e) => setClaimForm({ ...claimForm, admission_date: e.target.value })}
                            className="rounded-xl text-xs py-2.5"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col xs={12} md={3}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">Discharge Date *</Form.Label>
                          <Form.Control
                            type="date"
                            value={claimForm.discharge_date}
                            onChange={(e) => setClaimForm({ ...claimForm, discharge_date: e.target.value })}
                            className="rounded-xl text-xs py-2.5"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col xs={12} md={6}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">Treatment Category *</Form.Label>
                          <Form.Select
                            value={claimForm.treatment_type}
                            onChange={(e) => setClaimForm({ ...claimForm, treatment_type: e.target.value })}
                            className="rounded-xl text-xs py-2.5"
                          >
                            <option value="Inpatient Hospitalization">Inpatient Hospitalization (&gt; 24h)</option>
                            <option value="Day Care Treatment">Day Care Procedure (&lt; 24h)</option>
                            <option value="Pre/Post Hospitalization">Pre / Post Hospitalization Bills</option>
                            <option value="Maternity Care">Maternity / Delivery</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      {/* Section 4: Ailment & Claimed Amount */}
                      <Col xs={12} md={8}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">Ailment / Diagnosis Reason *</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="e.g. Acute Dengue Fever with Thrombocytopenia, Laparoscopic Appendectomy"
                            value={claimForm.ailment_diagnosis}
                            onChange={(e) => setClaimForm({ ...claimForm, ailment_diagnosis: e.target.value })}
                            className="rounded-xl text-xs py-2.5"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col xs={12} md={4}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">Total Claimed Amount (₹) *</Form.Label>
                          <Form.Control
                            type="number"
                            placeholder="e.g. 45000"
                            value={claimForm.claimed_amount}
                            onChange={(e) => setClaimForm({ ...claimForm, claimed_amount: e.target.value })}
                            className="rounded-xl text-xs py-2.5 font-bold text-emerald-700"
                            required
                          />
                        </Form.Group>
                      </Col>

                      {/* Section 5: DOCUMENT UPLOADS DROPZONE */}
                      <Col xs={12}>
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 mt-2">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                              <strong className="text-xs text-slate-800 d-flex align-items-center gap-1.5">
                                <LuUpload className="text-blue-600" /> Supporting Medical Documents & Bills
                              </strong>
                              <span className="text-[11px] text-slate-500 block">
                                Attach Hospital Final Bill, Discharge Summary, Doctor Prescriptions, Lab Reports, or Pharmacy Invoices.
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-slate-500">
                              Attached: <strong className="text-blue-600">{attachedDocs.length}</strong> doc(s)
                            </span>
                          </div>

                          {/* Upload Controls */}
                          <Row className="g-2 align-items-center mb-3">
                            <Col xs={12} sm={4}>
                              <Form.Select
                                value={docCategory}
                                onChange={(e) => setDocCategory(e.target.value)}
                                className="rounded-xl text-xs py-2 bg-white"
                              >
                                <option value="Hospital Final Bill">Hospital Final Bill & Receipt</option>
                                <option value="Discharge Summary">Discharge Summary / Card</option>
                                <option value="Doctor Prescription">Doctor Prescription & Advice</option>
                                <option value="Diagnostic Lab Report">Diagnostic & Lab Reports</option>
                                <option value="Pharmacy Invoices">Pharmacy & Medicine Bills</option>
                                <option value="Govt Photo ID">Patient Govt Photo ID</option>
                                <option value="Other">Other Supporting Document</option>
                              </Form.Select>
                            </Col>
                            <Col xs={12} sm={8}>
                              <div className="d-flex gap-2">
                                <Form.Control
                                  type="file"
                                  id="mediclaimFileInput"
                                  onChange={handleFileUpload}
                                  className="rounded-xl text-xs py-2 bg-white flex-grow-1"
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  disabled={uploadingDoc}
                                />
                                {uploadingDoc && (
                                  <div className="d-flex align-items-center gap-1 text-xs text-blue-600 px-2 font-medium">
                                    <Spinner animation="border" size="sm" /> Uploading...
                                  </div>
                                )}
                              </div>
                            </Col>
                          </Row>

                          {/* Uploaded Documents List */}
                          {attachedDocs.length > 0 ? (
                            <div className="d-flex flex-column gap-2">
                              {attachedDocs.map((doc, idx) => (
                                <div
                                  key={doc.id || idx}
                                  className="d-flex justify-content-between align-items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-2xs"
                                >
                                  <div className="d-flex align-items-center gap-2 text-truncate" style={{ maxWidth: "75%" }}>
                                    <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                                      <LuFileText size={15} />
                                    </span>
                                    <div className="text-truncate">
                                      <strong className="text-slate-800 text-xs d-block text-truncate">
                                        {doc.original_name}
                                      </strong>
                                      <span className="text-[10px] text-slate-400">
                                        Category: <span className="text-indigo-600 font-semibold">{doc.category}</span> &nbsp;•&nbsp;
                                        Size: {(doc.size / 1024).toFixed(1)} KB
                                      </span>
                                    </div>
                                  </div>

                                  <div className="d-flex align-items-center gap-2">
                                    <a
                                      href={getUploadUrl(doc.url)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-sm btn-outline-secondary py-1 px-2 text-[11px] rounded-lg d-flex align-items-center gap-1"
                                    >
                                      <LuEye size={12} /> View
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAttachedDoc(doc.id)}
                                      className="btn btn-sm btn-outline-danger py-1 px-2 text-[11px] rounded-lg border-0"
                                      title="Remove document"
                                    >
                                      <LuTrash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-3 text-slate-400 text-xs">
                              No files attached yet. Select document category and choose a file to upload.
                            </div>
                          )}
                        </div>
                      </Col>

                      {/* Remarks */}
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label className="text-xs fw-bold text-slate-700">Additional Remarks / Hospitalization Notes</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            placeholder="Any specific note regarding treatment, cashless claim intimation, or TPA queries..."
                            value={claimForm.remarks}
                            onChange={(e) => setClaimForm({ ...claimForm, remarks: e.target.value })}
                            className="rounded-xl text-xs py-2"
                          />
                        </Form.Group>
                      </Col>

                      {/* Submit Buttons */}
                      <Col xs={12} className="mt-4 text-end">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={submittingClaim}
                          className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-rose-600 hover:bg-rose-700 border-rose-600 shadow-sm"
                        >
                          {submittingClaim ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Submitting Claim...
                            </>
                          ) : (
                            <>Submit Mediclaim Claim</>
                          )}
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>

          {/* TAB 4: MY CLAIMS & LIVE TIMELINE TRACKER */}
          <Tab.Pane eventKey="my_claims">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold text-slate-800 m-0 text-base">My Submitted Claims & Lifecycle Tracker</h5>
                <p className="text-slate-500 text-xs m-0">Track real-time status, TPA verification, and settlement disbursals.</p>
              </div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setActiveTab("submit_claim")}
                className="rounded-xl text-xs py-2 px-3 d-flex align-items-center gap-1"
              >
                <LuPlus size={14} /> New Claim
              </Button>
            </div>

            {claims.length === 0 ? (
              <Card className="border-0 shadow-sm rounded-3xl p-5 text-center bg-white">
                <div className="text-5xl mb-3">📋</div>
                <h5 className="fw-bold text-slate-700">No Claims Filed Yet</h5>
                <p className="text-slate-400 text-xs max-w-md mx-auto">
                  You have not submitted any mediclaim reimbursement or cashless claims yet. When you file a claim, you can track every step here.
                </p>
                <div className="mt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab("submit_claim")}
                    className="rounded-xl px-4 py-2 text-xs bg-rose-600 border-rose-600"
                  >
                    Submit First Claim
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="d-flex flex-column gap-3">
                {claims.map((claim) => (
                  <Card key={claim.id} className="border-0 shadow-sm rounded-2xl p-4 bg-white">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">{claim.claim_number}</span>
                          {renderStatusBadge(claim.status)}
                          <span className="badge bg-slate-100 text-slate-600 text-[10px] rounded-pill">
                            {claim.treatment_type}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 mt-1 d-block">
                          Filed on: {claim.submission_date ? new Date(claim.submission_date).toLocaleDateString() : "—"} &nbsp;|&nbsp;
                          Patient: <strong className="text-slate-700">{claim.patient_name}</strong> ({claim.patient_relation})
                        </span>
                      </div>

                      <div className="text-md-end">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Claimed Amount</span>
                        <h4 className="fw-bold text-slate-900 m-0 text-lg">
                          ₹{(claim.claimed_amount || 0).toLocaleString("en-IN")}
                        </h4>
                        {claim.approved_amount && (
                          <span className="text-xs text-emerald-600 font-bold d-block">
                            Approved: ₹{claim.approved_amount.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Hospital, Diagnosis & Attached Docs */}
                    <Row className="my-3 g-2 text-xs">
                      <Col xs={12} md={4}>
                        <span className="text-slate-400 d-block">Hospital:</span>
                        <strong className="text-slate-800">{claim.hospital_name} ({claim.hospital_city})</strong>
                      </Col>
                      <Col xs={12} md={4}>
                        <span className="text-slate-400 d-block">Ailment / Diagnosis:</span>
                        <strong className="text-slate-800">{claim.ailment_diagnosis}</strong>
                      </Col>
                      <Col xs={12} md={4}>
                        <span className="text-slate-400 d-block">Hospitalization Stay:</span>
                        <span className="text-slate-700">{claim.admission_date} to {claim.discharge_date}</span>
                      </Col>
                    </Row>

                    {/* Visual Lifecycle Progress Bar */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 my-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Claim Lifecycle Status</span>
                      <div className="d-flex justify-content-between text-[11px] font-medium text-slate-600 position-relative">
                        <div className={`text-center ${["Submitted", "Under Review", "Documents Verified", "Approved", "Settled"].includes(claim.status) ? "text-blue-600 font-bold" : "text-slate-400"}`}>
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white d-inline-flex align-items-center justify-content-center text-[10px] mb-1">1</div>
                          <div>Submitted</div>
                        </div>
                        <div className={`text-center ${["Under Review", "Documents Verified", "Approved", "Settled"].includes(claim.status) ? "text-indigo-600 font-bold" : "text-slate-400"}`}>
                          <div className={`w-5 h-5 rounded-full ${["Under Review", "Documents Verified", "Approved", "Settled"].includes(claim.status) ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"} d-inline-flex align-items-center justify-content-center text-[10px] mb-1`}>2</div>
                          <div>TPA Review</div>
                        </div>
                        <div className={`text-center ${["Documents Verified", "Approved", "Settled"].includes(claim.status) ? "text-cyan-600 font-bold" : "text-slate-400"}`}>
                          <div className={`w-5 h-5 rounded-full ${["Documents Verified", "Approved", "Settled"].includes(claim.status) ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-500"} d-inline-flex align-items-center justify-content-center text-[10px] mb-1`}>3</div>
                          <div>Audit Verified</div>
                        </div>
                        <div className={`text-center ${["Approved", "Settled"].includes(claim.status) ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                          <div className={`w-5 h-5 rounded-full ${["Approved", "Settled"].includes(claim.status) ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"} d-inline-flex align-items-center justify-content-center text-[10px] mb-1`}>4</div>
                          <div>Approved</div>
                        </div>
                        <div className={`text-center ${claim.status === "Settled" ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                          <div className={`w-5 h-5 rounded-full ${claim.status === "Settled" ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-500"} d-inline-flex align-items-center justify-content-center text-[10px] mb-1`}>5</div>
                          <div>Settled / Paid</div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action bar */}
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-slate-100">
                      <div className="d-flex align-items-center gap-2 text-xs text-slate-500">
                        <span>Supporting Docs: <strong>{claim.supporting_documents?.length || 0}</strong> attached</span>
                        {claim.settlement_ref && (
                          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                            UTR: {claim.settlement_ref}
                          </span>
                        )}
                      </div>

                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedClaim(claim);
                            setShowClaimDetailsModal(true);
                          }}
                          className="rounded-lg text-xs py-1.5 px-3 d-flex align-items-center gap-1"
                        >
                          <LuEye size={13} /> View Documents & Details
                        </Button>

                        {["Submitted", "Query Raised"].includes(claim.status) && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleCancelClaim(claim.id)}
                            className="rounded-lg text-xs py-1.5 px-2.5"
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Tab.Pane>

          {/* TAB 5: COMPANY CLAIMS DESK (FOR HR & ADMIN) */}
          {isHRorAdmin && (
            <Tab.Pane eventKey="company_desk">
              <Card className="border-0 shadow-sm rounded-3xl p-4 bg-white mb-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-b border-slate-200 pb-3 mb-4">
                  <div>
                    <h4 className="fw-bold text-slate-900 m-0 text-lg d-flex align-items-center gap-2">
                      <LuFileSpreadsheet className="text-emerald-600" /> Company Mediclaim Claims Administration Desk
                    </h4>
                    <p className="text-slate-500 text-xs m-0">
                      Review employee medical claims, inspect uploaded bills and discharge summaries, approve claims, and disburse settlements.
                    </p>
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={handleExportClaimsExcel}
                      className="d-flex align-items-center gap-1.5 rounded-xl text-xs py-2 px-3 font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                      <LuFileSpreadsheet size={16} /> Export to Excel (.xlsx)
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={fetchCompanyClaims}
                      className="rounded-xl text-xs py-2 px-3"
                    >
                      <LuRefreshCw size={14} /> Refresh
                    </Button>
                  </div>
                </div>

                {/* Filter Controls */}
                <Row className="g-2 mb-3 align-items-center">
                  <Col xs={12} md={5}>
                    <div className="position-relative">
                      <LuSearch className="position-absolute text-slate-400" style={{ top: "11px", left: "12px" }} size={15} />
                      <Form.Control
                        type="text"
                        placeholder="Search by Employee Name, ID, Claim ID, Hospital..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchCompanyClaims()}
                        className="rounded-xl text-xs py-2 ps-5"
                      />
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <Form.Select
                      value={companyStatusFilter}
                      onChange={(e) => setCompanyStatusFilter(e.target.value)}
                      className="rounded-xl text-xs py-2"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Submitted">Submitted (New)</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Documents Verified">Documents Verified</option>
                      <option value="Approved">Approved</option>
                      <option value="Settled">Settled</option>
                      <option value="Query Raised">Query Raised</option>
                      <option value="Rejected">Rejected</option>
                    </Form.Select>
                  </Col>
                  <Col xs={6} md={2}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={fetchCompanyClaims}
                      className="w-100 rounded-xl text-xs py-2 bg-blue-600"
                    >
                      Apply Filter
                    </Button>
                  </Col>
                </Row>

                {/* Company Claims Table */}
                {loadingCompanyClaims ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="text-xs text-slate-400 mt-2">Loading company claims...</p>
                  </div>
                ) : companyClaims.length === 0 ? (
                  <div className="text-center py-5 text-slate-400 text-xs">
                    No claims match the selected criteria.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="align-middle text-xs mb-0">
                      <thead className="table-light text-slate-600 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th>Claim ID & Date</th>
                          <th>Employee & Dept</th>
                          <th>Patient & Relation</th>
                          <th>Hospital & Ailment</th>
                          <th>Claimed (₹)</th>
                          <th>Approved (₹)</th>
                          <th>Docs</th>
                          <th>Status</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyClaims.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <strong className="text-slate-900 font-mono d-block">{c.claim_number}</strong>
                              <span className="text-[10px] text-slate-400">
                                {c.submission_date ? new Date(c.submission_date).toLocaleDateString() : "—"}
                              </span>
                            </td>
                            <td>
                              <strong className="text-slate-800 d-block">{c.employee_name}</strong>
                              <span className="text-[10px] text-slate-400">
                                {c.employee_id} • {c.dept}
                              </span>
                            </td>
                            <td>
                              <span className="text-slate-800 font-semibold d-block">{c.patient_name}</span>
                              <span className="text-[10px] text-indigo-600">{c.patient_relation}</span>
                            </td>
                            <td>
                              <span className="text-slate-800 d-block">{c.hospital_name}</span>
                              <span className="text-[10px] text-slate-500">{c.ailment_diagnosis}</span>
                            </td>
                            <td>
                              <strong className="text-slate-900">₹{(c.claimed_amount || 0).toLocaleString("en-IN")}</strong>
                            </td>
                            <td>
                              {c.approved_amount ? (
                                <strong className="text-emerald-600">₹{c.approved_amount.toLocaleString("en-IN")}</strong>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td>
                              <button
                                onClick={() => {
                                  setSelectedClaim(c);
                                  setShowClaimDetailsModal(true);
                                }}
                                className="btn btn-sm btn-light border py-1 px-2 text-[11px] rounded-lg d-flex align-items-center gap-1"
                              >
                                <LuEye size={12} /> {c.supporting_documents?.length || 0}
                              </button>
                            </td>
                            <td>{renderStatusBadge(c.status)}</td>
                            <td className="text-end">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenReviewModal(c)}
                                className="rounded-lg text-xs py-1 px-2.5 bg-blue-600"
                              >
                                Review
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card>
            </Tab.Pane>
          )}

          {/* TAB 6: NETWORK HOSPITALS & CASHLESS HELPDESK */}
          <Tab.Pane eventKey="network_hospitals">
            <Card className="border-0 shadow-sm rounded-3xl p-4 bg-white">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-b border-slate-200 pb-3 mb-4">
                <div>
                  <h4 className="fw-bold text-slate-900 m-0 text-lg d-flex align-items-center gap-2">
                    <LuHospital className="text-rose-600" /> Cashless Network Hospitals Directory
                  </h4>
                  <p className="text-slate-500 text-xs m-0">
                    Over 8,500+ pan-India network hospitals partner with our TPA Medi Assist for instant cashless hospitalization.
                  </p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-xs text-rose-700 font-semibold d-flex align-items-center gap-1.5">
                  <LuPhoneCall size={14} /> Cashless TPA Desk: 1800-425-9449
                </div>
              </div>

              {/* Search Bar */}
              <Row className="g-2 mb-4">
                <Col xs={12} md={7}>
                  <div className="position-relative">
                    <LuSearch className="position-absolute text-slate-400" style={{ top: "11px", left: "12px" }} size={15} />
                    <Form.Control
                      type="text"
                      placeholder="Search hospitals by name, area, or locality..."
                      value={hospitalSearch}
                      onChange={(e) => setHospitalSearch(e.target.value)}
                      className="rounded-xl text-xs py-2 ps-5"
                    />
                  </div>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Select
                    value={hospitalCity}
                    onChange={(e) => setHospitalCity(e.target.value)}
                    className="rounded-xl text-xs py-2"
                  >
                    <option value="All">All Cities</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Navi Mumbai">Navi Mumbai</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                    <option value="Gurugram">Gurugram</option>
                    <option value="Kolkata">Kolkata</option>
                  </Form.Select>
                </Col>
              </Row>

              {/* Hospital Cards Grid */}
              <Row className="g-3">
                {filteredHospitals.map((hosp) => (
                  <Col xs={12} md={6} lg={4} key={hosp.id}>
                    <Card className="border border-slate-200 shadow-2xs rounded-2xl p-3.5 bg-white h-100 hover-card">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Badge bg="success" className="bg-emerald-100 text-emerald-800 text-[10px] rounded-pill font-semibold px-2 py-0.5">
                          ✓ Cashless Available
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-semibold">{hosp.type}</span>
                      </div>
                      <h6 className="fw-bold text-slate-900 m-0 text-sm mb-1">{hosp.name}</h6>
                      <span className="text-xs text-slate-500 d-block">
                        📍 {hosp.area}, {hosp.city}
                      </span>
                      <div className="mt-3 pt-2 border-top border-slate-100 d-flex justify-content-between align-items-center text-xs">
                        <span className="text-slate-400">Emergency Desk:</span>
                        <a href={`tel:${hosp.helpline}`} className="font-bold text-blue-600 text-decoration-none">
                          {hosp.helpline}
                        </a>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* MODAL 1: ADD DEPENDENT */}
      <Modal show={showAddDepModal} onHide={() => setShowAddDepModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base fw-bold text-slate-900 d-flex align-items-center gap-2">
            <LuUsers className="text-blue-600" /> Enroll Family Dependent
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <p className="text-slate-400 text-xs mb-3">
            Add dependent family members for cashless hospital coverage under your corporate health insurance policy.
          </p>
          <Form onSubmit={handleAddDependent}>
            <Form.Group className="mb-2.5">
              <Form.Label className="text-xs fw-bold text-slate-700">Full Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Dependent's full name as on Govt ID"
                value={depForm.name}
                onChange={(e) => setDepForm({ ...depForm, name: e.target.value })}
                className="rounded-xl text-xs py-2"
                required
              />
            </Form.Group>

            <Row className="g-2 mb-2.5">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Relationship *</Form.Label>
                  <Form.Select
                    value={depForm.relation}
                    onChange={(e) => setDepForm({ ...depForm, relation: e.target.value })}
                    className="rounded-xl text-xs py-2"
                  >
                    <option value="Spouse">Spouse (Husband/Wife)</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Gender *</Form.Label>
                  <Form.Select
                    value={depForm.gender}
                    onChange={(e) => setDepForm({ ...depForm, gender: e.target.value })}
                    className="rounded-xl text-xs py-2"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Date of Birth *</Form.Label>
                  <Form.Control
                    type="date"
                    value={depForm.dob}
                    onChange={(e) => setDepForm({ ...depForm, dob: e.target.value })}
                    className="rounded-xl text-xs py-2"
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Blood Group</Form.Label>
                  <Form.Select
                    value={depForm.blood_group}
                    onChange={(e) => setDepForm({ ...depForm, blood_group: e.target.value })}
                    className="rounded-xl text-xs py-2"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="light" size="sm" onClick={() => setShowAddDepModal(false)} className="rounded-xl text-xs px-3">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={savingDep} className="rounded-xl text-xs px-4 bg-blue-600">
                {savingDep ? "Enrolling..." : "Enroll Dependent"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* MODAL 2: UPDATE NOMINEE */}
      <Modal show={showNomineeModal} onHide={() => setShowNomineeModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base fw-bold text-slate-900">Update Policy Nominee</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <Form onSubmit={handleSaveNominee}>
            <Form.Group className="mb-2.5">
              <Form.Label className="text-xs fw-bold text-slate-700">Nominee Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Full name of beneficiary"
                value={nomineeForm.nominee_name}
                onChange={(e) => setNomineeForm({ ...nomineeForm, nominee_name: e.target.value })}
                className="rounded-xl text-xs py-2"
                required
              />
            </Form.Group>
            <Form.Group className="mb-2.5">
              <Form.Label className="text-xs fw-bold text-slate-700">Relationship *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Spouse, Mother, Father, Sibling"
                value={nomineeForm.nominee_relation}
                onChange={(e) => setNomineeForm({ ...nomineeForm, nominee_relation: e.target.value })}
                className="rounded-xl text-xs py-2"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="text-xs fw-bold text-slate-700">Nominee Contact Number</Form.Label>
              <Form.Control
                type="tel"
                placeholder="Mobile number"
                value={nomineeForm.nominee_contact}
                onChange={(e) => setNomineeForm({ ...nomineeForm, nominee_contact: e.target.value })}
                className="rounded-xl text-xs py-2"
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="light" size="sm" onClick={() => setShowNomineeModal(false)} className="rounded-xl text-xs px-3">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="rounded-xl text-xs px-4 bg-blue-600">
                Save Nominee
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* MODAL 3: VIEW CLAIM DETAILS & UPLOADED DOCUMENTS */}
      <Modal show={showClaimDetailsModal} onHide={() => setShowClaimDetailsModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base fw-bold text-slate-900 d-flex align-items-center gap-2">
            <LuFileText className="text-blue-600" />
            Claim Details: {selectedClaim?.claim_number}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          {selectedClaim && (
            <div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-3 text-xs">
                <Row className="g-2">
                  <Col xs={6} md={3}>
                    <span className="text-slate-400 d-block">Patient Name:</span>
                    <strong className="text-slate-800">{selectedClaim.patient_name} ({selectedClaim.patient_relation})</strong>
                  </Col>
                  <Col xs={6} md={3}>
                    <span className="text-slate-400 d-block">Hospital:</span>
                    <strong className="text-slate-800">{selectedClaim.hospital_name}</strong>
                  </Col>
                  <Col xs={6} md={3}>
                    <span className="text-slate-400 d-block">Claimed Amount:</span>
                    <strong className="text-slate-900 font-bold">₹{selectedClaim.claimed_amount?.toLocaleString("en-IN")}</strong>
                  </Col>
                  <Col xs={6} md={3}>
                    <span className="text-slate-400 d-block">Status:</span>
                    {renderStatusBadge(selectedClaim.status)}
                  </Col>
                </Row>
              </div>

              <h6 className="fw-bold text-slate-800 text-xs mb-2">Uploaded Supporting Documents & Medical Bills</h6>
              {(!selectedClaim.supporting_documents || selectedClaim.supporting_documents.length === 0) ? (
                <div className="text-center py-4 bg-slate-50 rounded-2xl text-slate-400 text-xs">
                  No supporting documents were uploaded for this claim.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {selectedClaim.supporting_documents.map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      className="d-flex justify-content-between align-items-center p-2.5 rounded-xl border border-slate-200 bg-white text-xs shadow-2xs"
                    >
                      <div className="d-flex align-items-center gap-2.5 text-truncate" style={{ maxWidth: "70%" }}>
                        <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                          <LuFileText size={16} />
                        </span>
                        <div className="text-truncate">
                          <strong className="text-slate-900 text-xs d-block text-truncate">{doc.original_name}</strong>
                          <span className="text-[10px] text-slate-400">
                            {doc.category} • {(doc.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <a
                        href={getUploadUrl(doc.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-primary rounded-lg text-xs py-1 px-3 d-flex align-items-center gap-1 bg-blue-600"
                      >
                        <LuExternalLink size={13} /> Open / Download
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {selectedClaim.hr_remarks && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <strong>Reviewer / HR Remarks:</strong> {selectedClaim.hr_remarks}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" size="sm" onClick={() => setShowClaimDetailsModal(false)} className="rounded-xl text-xs px-3">
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL 4: HR REVIEW & APPROVE CLAIM */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base fw-bold text-slate-900">
            Process Claim: {reviewingClaim?.claim_number}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          {reviewingClaim && (
            <Form onSubmit={handleSubmitReview}>
              <div className="bg-slate-50 p-2.5 rounded-xl text-xs mb-3 border border-slate-200">
                <div>Employee: <strong>{reviewingClaim.employee_name}</strong> ({reviewingClaim.employee_id})</div>
                <div>Patient: <strong>{reviewingClaim.patient_name}</strong> ({reviewingClaim.patient_relation})</div>
                <div>Claimed: <strong>₹{reviewingClaim.claimed_amount?.toLocaleString("en-IN")}</strong></div>
              </div>

              <Form.Group className="mb-2.5">
                <Form.Label className="text-xs fw-bold text-slate-700">Update Status *</Form.Label>
                <Form.Select
                  value={reviewForm.status}
                  onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                  className="rounded-xl text-xs py-2"
                  required
                >
                  <option value="Under Review">Under Review</option>
                  <option value="Documents Verified">Documents Verified</option>
                  <option value="Approved">Approved</option>
                  <option value="Settled">Settled & Paid</option>
                  <option value="Query Raised">Query Raised (More Info Required)</option>
                  <option value="Rejected">Rejected</option>
                </Form.Select>
              </Form.Group>

              <Row className="g-2 mb-2.5">
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label className="text-xs fw-bold text-slate-700">Approved Amount (₹)</Form.Label>
                    <Form.Control
                      type="number"
                      value={reviewForm.approved_amount}
                      onChange={(e) => setReviewForm({ ...reviewForm, approved_amount: e.target.value })}
                      className="rounded-xl text-xs py-2 text-emerald-700 font-bold"
                    />
                  </Form.Group>
                </Col>
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label className="text-xs fw-bold text-slate-700">Settled Amount (₹)</Form.Label>
                    <Form.Control
                      type="number"
                      value={reviewForm.settled_amount}
                      onChange={(e) => setReviewForm({ ...reviewForm, settled_amount: e.target.value })}
                      className="rounded-xl text-xs py-2"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-2.5">
                <Form.Label className="text-xs fw-bold text-slate-700">Settlement Ref / UTR / Cheque No</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. UTR-AXIS-20260922-9901"
                  value={reviewForm.settlement_ref}
                  onChange={(e) => setReviewForm({ ...reviewForm, settlement_ref: e.target.value })}
                  className="rounded-xl text-xs py-2"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="text-xs fw-bold text-slate-700">HR / TPA Remarks</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Verification notes or reason for deduction/query..."
                  value={reviewForm.hr_remarks}
                  onChange={(e) => setReviewForm({ ...reviewForm, hr_remarks: e.target.value })}
                  className="rounded-xl text-xs py-2"
                />
              </Form.Group>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Button variant="light" size="sm" onClick={() => setShowReviewModal(false)} className="rounded-xl text-xs px-3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={savingReview} className="rounded-xl text-xs px-4 bg-blue-600">
                  {savingReview ? "Updating..." : "Save Claim Status"}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}
