import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  LuShieldCheck,
  LuClock,
  LuTriangleAlert,
  LuFileText,
  LuCloudUpload,
  LuCircleCheck,
  LuUser,
  LuCreditCard,
  LuBriefcase,
  LuGraduationCap,
  LuFileCheck,
  LuArrowRight,
  LuArrowLeft,
  LuTrash2,
  LuExternalLink,
  LuLock,
  LuSparkles,
  LuBadgeAlert,
  LuBuilding,
  LuPhone,
  LuMail,
  LuCheck,
} from "react-icons/lu";
import toast, { Toaster } from "react-hot-toast";
import api, { getUploadUrl } from "../../api/axios";

export default function PreJoiningCandidatePortal() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [portalData, setPortalData] = useState(null);
  const [expired, setExpired] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  // Form State
  const [currentStep, setCurrentStep] = useState(1);

  // 1. Personal & Emergency
  const [personal, setPersonal] = useState({
    dob: "",
    gender: "Male",
    blood_group: "O+",
    current_address: "",
    permanent_address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "Parent",
  });

  // 2. KYC
  const [kyc, setKyc] = useState({
    aadhaar_number: "",
    aadhaar_doc_url: "",
    pan_number: "",
    pan_doc_url: "",
    photo_url: "",
  });

  // 3. Prior Employment
  const [priorEmp, setPriorEmp] = useState({
    is_fresher: false,
    company_name: "",
    designation: "",
    relieving_letter_url: "",
    experience_cert_url: "",
    payslip_1_url: "",
    payslip_2_url: "",
    payslip_3_url: "",
    resignation_acceptance_url: "",
  });

  // 4. Bank Details
  const [bank, setBank] = useState({
    bank_name: "",
    account_number: "",
    confirm_account_number: "",
    ifsc_code: "",
    account_holder_name: "",
    branch_name: "",
    cheque_doc_url: "",
  });

  // 5. Education
  const [education, setEducation] = useState({
    highest_qualification: "Bachelor's Degree",
    degree_name: "",
    institution: "",
    passing_year: new Date().getFullYear().toString(),
    marksheet_doc_url: "",
  });

  // 6. Declaration & E-Signature
  const [signatureName, setSignatureName] = useState("");
  const [declarationAgreed, setDeclarationAgreed] = useState(false);

  // Uploading status tracker per field
  const [uploadingFields, setUploadingFields] = useState({});

  // 1. Fetch Candidate Portal Details
  useEffect(() => {
    fetchPortalInfo();
  }, [token]);

  const fetchPortalInfo = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      let res;
      try {
        res = await api.get(`/pre-joining/public/${token}`);
      } catch (e1) {
        // Fallback directly to backend root route if proxy altered prefix
        res = await api.get(`/api/pre-joining/public/${token}`);
      }

      if (res.data?.expired) {
        setExpired(true);
        setPortalData(res.data.data);
      } else if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setPortalData(d);

        // Pre-fill existing data if candidate resumes
        if (d.personal_details && Object.keys(d.personal_details).length) {
          setPersonal((prev) => ({ ...prev, ...d.personal_details }));
        }
        if (d.kyc_documents && Object.keys(d.kyc_documents).length) {
          setKyc((prev) => ({ ...prev, ...d.kyc_documents }));
        }
        if (d.prior_employment && Object.keys(d.prior_employment).length) {
          setPriorEmp((prev) => ({ ...prev, ...d.prior_employment }));
        }
        if (d.bank_details && Object.keys(d.bank_details).length) {
          setBank((prev) => ({
            ...prev,
            ...d.bank_details,
            confirm_account_number: d.bank_details.account_number || "",
          }));
        }
        if (d.educational_documents && Object.keys(d.educational_documents).length) {
          setEducation((prev) => ({ ...prev, ...d.educational_documents }));
        }
        if (d.digital_signature_name) setSignatureName(d.digital_signature_name);
        if (d.declaration_agreed) setDeclarationAgreed(d.declaration_agreed);

        if (d.status === "SUBMITTED" || d.status === "VERIFIED") {
          setSubmittedSuccess(true);
        }
      } else {
        setErrorMessage(res.data?.error || "Invalid or inaccessible pre-joining portal link.");
      }
    } catch (err) {
      console.error("Portal fetch error:", err);
      if (err.response?.data?.expired) {
        setExpired(true);
        setPortalData(err.response.data.data);
      } else {
        setErrorMessage(err.response?.data?.error || "Failed to load pre-joining portal. Please check your link.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Countdown Timer Loop
  useEffect(() => {
    if (!portalData?.expires_at) return;

    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(portalData.expires_at).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        setExpired(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [portalData?.expires_at]);

  // 3. Document Uploader Handler
  const handleFileUpload = async (e, fieldKey, section) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size <= 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit. Please upload a smaller document.");
      return;
    }

    setUploadingFields((prev) => ({ ...prev, [fieldKey]: true }));
    const formData = new FormData();
    formData.append("doc_file", file);

    try {
      let res;
      try {
        res = await api.post(`/pre-joining/public/${token}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (upErr) {
        res = await api.post(`/api/pre-joining/public/${token}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (res.data?.success && res.data.fileUrl) {
        const uploadedUrl = res.data.fileUrl;
        toast.success(`${file.name} uploaded successfully!`);

        if (section === "kyc") {
          setKyc((prev) => ({ ...prev, [fieldKey]: uploadedUrl }));
        } else if (section === "priorEmp") {
          setPriorEmp((prev) => ({ ...prev, [fieldKey]: uploadedUrl }));
        } else if (section === "bank") {
          setBank((prev) => ({ ...prev, [fieldKey]: uploadedUrl }));
        } else if (section === "education") {
          setEducation((prev) => ({ ...prev, [fieldKey]: uploadedUrl }));
        }
      } else {
        toast.error(res.data?.error || "Failed to upload file");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploadingFields((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  // 4. Submit Complete Portal
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!declarationAgreed) {
      toast.error("Please agree to the truthfulness declaration before submitting.");
      return;
    }
    if (!signatureName.trim()) {
      toast.error("Please enter your Full Legal Name as your digital e-signature.");
      return;
    }

    // Step 2 validations (KYC)
    if (!kyc.pan_number.trim() || !kyc.pan_doc_url) {
      toast.error("Please provide both PAN number and PAN card document.");
      setCurrentStep(2);
      return;
    }
    if (!kyc.aadhaar_number.trim() || !kyc.aadhaar_doc_url) {
      toast.error("Please provide both Aadhaar number and Aadhaar document.");
      setCurrentStep(2);
      return;
    }

    // Step 3 validations (Employment)
    if (!priorEmp.is_fresher && !priorEmp.relieving_letter_url && !priorEmp.experience_cert_url) {
      toast.error("Please upload either your Relieving Letter or Experience Certificate.");
      setCurrentStep(3);
      return;
    }

    // Step 4 validations (Bank)
    if (!bank.account_number || !bank.ifsc_code) {
      toast.error("Bank Account Number and IFSC Code are required.");
      setCurrentStep(4);
      return;
    }
    if (bank.account_number !== bank.confirm_account_number) {
      toast.error("Bank Account Number and Confirm Account Number do not match.");
      setCurrentStep(4);
      return;
    }
    if (!bank.cheque_doc_url) {
      toast.error("Please upload a Cancelled Cheque or Bank Passbook copy.");
      setCurrentStep(4);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        personal_details: personal,
        kyc_documents: kyc,
        prior_employment: priorEmp,
        bank_details: {
          bank_name: bank.bank_name,
          account_number: bank.account_number,
          ifsc_code: bank.ifsc_code.toUpperCase().trim(),
          account_holder_name: bank.account_holder_name || portalData.candidate_name,
          branch_name: bank.branch_name,
          cheque_doc_url: bank.cheque_doc_url,
        },
        educational_documents: education,
        digital_signature_name: signatureName.trim(),
        declaration_agreed: true,
      };

      let res;
      try {
        res = await api.post(`/pre-joining/public/${token}/submit`, payload);
      } catch (sErr) {
        res = await api.post(`/api/pre-joining/public/${token}/submit`, payload);
      }

      if (res.data?.success) {
        toast.success("Documents submitted successfully to HR!");
        setSubmittedSuccess(true);
      } else {
        toast.error(res.data?.error || "Submission could not be completed.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err.response?.data?.error || "Failed to submit documents. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper render for uploaded file preview
  const renderFilePreview = (url, label, fieldKey, section) => {
    if (!url) return null;
    const fullUrl = getUploadUrl(url);
    const filename = url.split("/").pop() || "Document";

    return (
      <div className="mt-2 flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
        <div className="flex items-center gap-2 truncate pr-2">
          <LuFileCheck className="text-emerald-600 flex-shrink-0" size={16} />
          <span className="font-semibold text-emerald-900 truncate">{filename}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            Preview <LuExternalLink size={12} />
          </a>
          {!submittedSuccess && (
            <button
              type="button"
              onClick={() => {
                if (section === "kyc") setKyc((prev) => ({ ...prev, [fieldKey]: "" }));
                if (section === "priorEmp") setPriorEmp((prev) => ({ ...prev, [fieldKey]: "" }));
                if (section === "bank") setBank((prev) => ({ ...prev, [fieldKey]: "" }));
                if (section === "education") setEducation((prev) => ({ ...prev, [fieldKey]: "" }));
              }}
              className="text-rose-500 hover:text-rose-700 p-1"
              title="Remove file"
            >
              <LuTrash2 size={13} />
            </button>
          )}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // RENDERING LOGIC
  // -------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Verifying Pre-Joining Link...</h2>
          <p className="text-xs text-slate-500 mt-1">Checking secure 7-day token validity with HR servers.</p>
        </div>
      </div>
    );
  }

  // 1. Error / Not Found State
  if (errorMessage && !expired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-rose-100">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <LuTriangleAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Invalid or Expired Link</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{errorMessage}</p>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Please contact HR at <span className="font-semibold text-slate-700">hr@zentelex.com</span> to receive a fresh pre-joining link.
          </div>
        </div>
      </div>
    );
  }

  // 2. 7-Day Expired State
  if (expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-amber-200">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 ring-amber-50">
            <LuClock size={32} />
          </div>
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            7-Day Expiration Passed
          </span>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pre-Joining Link Has Expired</h2>
          <p className="text-xs md:text-sm text-slate-600 mt-3 leading-relaxed">
            Hi <span className="font-bold text-slate-800">{portalData?.candidate_name || "Candidate"}</span>, this secure pre-joining document upload link had a validity of <strong>7 days</strong> from issuance and has expired on{" "}
            <strong>{portalData?.expires_at ? new Date(portalData.expires_at).toLocaleDateString() : "recently"}</strong>.
          </p>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Candidate Email:</span>
              <span className="font-semibold text-slate-700">{portalData?.candidate_email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Designation:</span>
              <span className="font-semibold text-slate-700">{portalData?.designation || "New Joiner"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Expected Joining:</span>
              <span className="font-semibold text-slate-700">{portalData?.joining_date || "Upcoming"}</span>
            </div>
          </div>

          <div className="mt-6 p-3 bg-blue-50 text-blue-800 rounded-lg text-xs font-medium">
            Don't worry! HR can generate an instant 7-day link extension for you. Reach out to your HR coordinator or email <strong>hr@zentelex.com</strong>.
          </div>
        </div>
      </div>
    );
  }

  // 3. Submitted Success State
  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl max-w-lg w-full text-center border border-slate-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LuCircleCheck size={36} />
          </div>
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            Submission Confirmed
          </span>
          <h2 className="text-2xl font-black text-slate-800">Documents Submitted Successfully!</h2>
          <p className="text-xs md:text-sm text-slate-600 mt-2 leading-relaxed">
            Thank you, <span className="font-bold text-slate-800">{portalData?.candidate_name}</span>. Your KYC, prior employment, and banking details have been securely transferred to the HR verification queue.
          </p>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left border border-slate-200 text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Reference Token:</span>
              <span className="font-mono font-semibold text-slate-700">{token.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Designation:</span>
              <span className="font-semibold text-slate-700">{portalData?.designation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Official Joining Date:</span>
              <span className="font-semibold text-emerald-700">{portalData?.joining_date || "Day 1"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Status:</span>
              <span className="font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Under HR Verification</span>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500 leading-relaxed">
            Our onboarding team will review your documents within 24 to 48 hours. If any additional proof is needed, you will receive an update on your registered email.
          </div>
        </div>
      </div>
    );
  }

  // 4. Main Upload Portal
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Toaster position="top-right" />

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xl shadow-md shadow-blue-500/20">
              Z
            </div>
            <div>
              <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                Pre-Joining Candidate Self-Upload Portal
              </h1>
              <p className="text-[11px] text-slate-500">
                Official Day-1 Onboarding Document Verification • Zentelex
              </p>
            </div>
          </div>

          {/* 7-Day Countdown Badge */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-semibold shadow-sm">
            <LuClock className="text-amber-600 animate-pulse" size={16} />
            <span>
              Expires in:{" "}
              <strong className="font-black text-amber-800">
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </strong>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-1 bg-white/10 rounded-md text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
                Candidate Document Verification
              </span>
              <h2 className="text-xl md:text-2xl font-black mt-1">
                Welcome, {portalData?.candidate_name}!
              </h2>
              <p className="text-xs text-blue-100 mt-1 max-w-2xl">
                Please upload your KYC, prior relieving letters, and banking details before your official Day 1 (
                <strong>{portalData?.joining_date || "Day 1"}</strong>) so our HR and IT teams can set up your credentials, payroll, and benefits.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl text-xs space-y-1 self-start md:self-auto">
              <div>
                <span className="text-blue-200">Designation:</span>{" "}
                <span className="font-bold text-white">{portalData?.designation}</span>
              </div>
              <div>
                <span className="text-blue-200">Department:</span>{" "}
                <span className="font-bold text-white">{portalData?.department || "Engineering"}</span>
              </div>
              <div>
                <span className="text-blue-200">Work Location:</span>{" "}
                <span className="font-bold text-white">{portalData?.work_location || "Headquarters"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Ribbon */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 overflow-x-auto">
          <div className="flex items-center min-w-[550px] justify-between">
            {[
              { num: 1, label: "Personal Info", icon: LuUser },
              { num: 2, label: "KYC Documents", icon: LuFileText },
              { num: 3, label: "Prior Employment", icon: LuBriefcase },
              { num: 4, label: "Bank Details", icon: LuCreditCard },
              { num: 5, label: "Education", icon: LuGraduationCap },
              { num: 6, label: "Declaration", icon: LuFileCheck },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = currentStep === s.num;
              const isDone = currentStep > s.num;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setCurrentStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : isDone
                        ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive
                        ? "bg-white text-blue-600"
                        : isDone
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                  >
                    {isDone ? <LuCheck size={11} /> : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Body Container */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          {/* STEP 1: Personal & Emergency */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <LuUser className="text-blue-600" /> Step 1: Personal & Emergency Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm your personal information and provide an emergency contact.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={personal.dob}
                    onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={personal.gender}
                    onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={personal.blood_group}
                    onChange={(e) => setPersonal({ ...personal, blood_group: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Residential Address</label>
                  <textarea
                    rows={3}
                    placeholder="Flat/House No, Street, City, State, PIN"
                    value={personal.current_address}
                    onChange={(e) => setPersonal({ ...personal, current_address: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Permanent Address</label>
                  <textarea
                    rows={3}
                    placeholder="Same as current or permanent address"
                    value={personal.permanent_address}
                    onChange={(e) => setPersonal({ ...personal, permanent_address: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Emergency Contact Person</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={personal.emergency_contact_name}
                      onChange={(e) => setPersonal({ ...personal, emergency_contact_name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Emergency Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={personal.emergency_contact_phone}
                      onChange={(e) => setPersonal({ ...personal, emergency_contact_phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Relationship</label>
                    <input
                      type="text"
                      placeholder="e.g. Father / Spouse / Sibling"
                      value={personal.emergency_contact_relation}
                      onChange={(e) => setPersonal({ ...personal, emergency_contact_relation: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
                >
                  Next: KYC Documents <LuArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: KYC Documents */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <LuFileText className="text-blue-600" /> Step 2: KYC Verification Documents
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload official Government ID documents (PDF, JPG, PNG up to 10MB).
                </p>
              </div>

              {/* PAN Card */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">1. Permanent Account Number (PAN Card) *</h4>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Required for Tax</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">10-Digit PAN Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. ABCDE1234F"
                      value={kyc.pan_number}
                      onChange={(e) => setKyc({ ...kyc, pan_number: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs uppercase font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Upload PAN Card Copy</label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-xs font-medium text-slate-600">
                      <LuCloudUpload className="text-blue-600" size={16} />
                      <span>{uploadingFields.pan_doc_url ? "Uploading..." : "Select PAN File (PDF/Image)"}</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, "pan_doc_url", "kyc")}
                        className="hidden"
                      />
                    </label>
                    {renderFilePreview(kyc.pan_doc_url, "PAN Card", "pan_doc_url", "kyc")}
                  </div>
                </div>
              </div>

              {/* Aadhaar Card */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">2. Aadhaar Card (Front & Back) *</h4>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Required for Identity</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">12-Digit Aadhaar Number</label>
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="e.g. 1234 5678 9012"
                      value={kyc.aadhaar_number}
                      onChange={(e) => setKyc({ ...kyc, aadhaar_number: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Upload Aadhaar Document</label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-xs font-medium text-slate-600">
                      <LuCloudUpload className="text-blue-600" size={16} />
                      <span>{uploadingFields.aadhaar_doc_url ? "Uploading..." : "Select Aadhaar File (PDF/Image)"}</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, "aadhaar_doc_url", "kyc")}
                        className="hidden"
                      />
                    </label>
                    {renderFilePreview(kyc.aadhaar_doc_url, "Aadhaar Card", "aadhaar_doc_url", "kyc")}
                  </div>
                </div>
              </div>

              {/* Passport-size Photo */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">3. Recent Passport Size Color Photograph</h4>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {kyc.photo_url ? (
                      <img src={getUploadUrl(kyc.photo_url)} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <LuUser className="text-slate-400" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 shadow-sm">
                      <LuCloudUpload className="text-blue-600" size={15} />
                      <span>{uploadingFields.photo_url ? "Uploading..." : "Upload Profile Photo"}</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, "photo_url", "kyc")}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1">Formal photo with plain background for employee ID card badge.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  <LuArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
                >
                  Next: Prior Employment <LuArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Prior Employment & Relieving Letters */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <LuBriefcase className="text-blue-600" /> Step 3: Prior Employment & Relieving Documents
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload relieving letters, experience letters, and recent payslips from your last organization.
                  </p>
                </div>

                {/* Fresher Toggle */}
                <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={priorEmp.is_fresher}
                    onChange={(e) => setPriorEmp({ ...priorEmp, is_fresher: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>I am a Fresher (No Prior Experience)</span>
                </label>
              </div>

              {priorEmp.is_fresher ? (
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <LuCircleCheck className="text-blue-600 mx-auto mb-2" size={32} />
                  <h4 className="text-sm font-bold text-blue-900">Fresher Candidate Confirmed</h4>
                  <p className="text-xs text-blue-700 mt-1 max-w-md mx-auto">
                    Prior employment and relieving letters are waived for fresh graduates. You can proceed directly to the next step.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Previous Company Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Tech Solutions Ltd."
                        value={priorEmp.company_name}
                        onChange={(e) => setPriorEmp({ ...priorEmp, company_name: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Designation Held *</label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Software Engineer"
                        value={priorEmp.designation}
                        onChange={(e) => setPriorEmp({ ...priorEmp, designation: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Relieving Letter & Experience Certificate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                      <h4 className="text-xs font-bold text-slate-800 mb-1">Relieving Letter *</h4>
                      <p className="text-[11px] text-slate-500 mb-2">Formal relieving letter on company letterhead.</p>
                      <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-xs font-medium text-slate-600">
                        <LuCloudUpload className="text-blue-600" size={15} />
                        <span>{uploadingFields.relieving_letter_url ? "Uploading..." : "Upload Relieving Letter"}</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, "relieving_letter_url", "priorEmp")}
                          className="hidden"
                        />
                      </label>
                      {renderFilePreview(priorEmp.relieving_letter_url, "Relieving Letter", "relieving_letter_url", "priorEmp")}
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                      <h4 className="text-xs font-bold text-slate-800 mb-1">Experience Certificate</h4>
                      <p className="text-[11px] text-slate-500 mb-2">Service certificate detailing tenure and roles.</p>
                      <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-xs font-medium text-slate-600">
                        <LuCloudUpload className="text-blue-600" size={15} />
                        <span>{uploadingFields.experience_cert_url ? "Uploading..." : "Upload Experience Certificate"}</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, "experience_cert_url", "priorEmp")}
                          className="hidden"
                        />
                      </label>
                      {renderFilePreview(priorEmp.experience_cert_url, "Experience Certificate", "experience_cert_url", "priorEmp")}
                    </div>
                  </div>

                  {/* Last 3 Months Payslips */}
                  <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800">Last 3 Months Salary Payslips</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payslip Month 1</label>
                        <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-[11px] font-medium text-slate-600">
                          <LuCloudUpload className="text-blue-600" size={14} />
                          <span>{uploadingFields.payslip_1_url ? "Uploading..." : "Upload Slip 1"}</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, "payslip_1_url", "priorEmp")}
                            className="hidden"
                          />
                        </label>
                        {renderFilePreview(priorEmp.payslip_1_url, "Payslip 1", "payslip_1_url", "priorEmp")}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payslip Month 2</label>
                        <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-[11px] font-medium text-slate-600">
                          <LuCloudUpload className="text-blue-600" size={14} />
                          <span>{uploadingFields.payslip_2_url ? "Uploading..." : "Upload Slip 2"}</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, "payslip_2_url", "priorEmp")}
                            className="hidden"
                          />
                        </label>
                        {renderFilePreview(priorEmp.payslip_2_url, "Payslip 2", "payslip_2_url", "priorEmp")}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payslip Month 3</label>
                        <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-[11px] font-medium text-slate-600">
                          <LuCloudUpload className="text-blue-600" size={14} />
                          <span>{uploadingFields.payslip_3_url ? "Uploading..." : "Upload Slip 3"}</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, "payslip_3_url", "priorEmp")}
                            className="hidden"
                          />
                        </label>
                        {renderFilePreview(priorEmp.payslip_3_url, "Payslip 3", "payslip_3_url", "priorEmp")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  <LuArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
                >
                  Next: Bank Details <LuArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Bank Account Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <LuCreditCard className="text-blue-600" /> Step 4: Bank Details for Salary Credit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your bank account details and upload a cancelled cheque or first page of bank passbook.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                    value={bank.bank_name}
                    onChange={(e) => setBank({ ...bank, bank_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name *</label>
                  <input
                    type="text"
                    placeholder="Name as per bank records"
                    value={bank.account_holder_name}
                    onChange={(e) => setBank({ ...bank, account_holder_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Account Number *</label>
                  <input
                    type="password"
                    placeholder="Enter account number"
                    value={bank.account_number}
                    onChange={(e) => setBank({ ...bank, account_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Account Number *</label>
                  <input
                    type="text"
                    placeholder="Re-enter account number"
                    value={bank.confirm_account_number}
                    onChange={(e) => setBank({ ...bank, confirm_account_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code *</label>
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="e.g. HDFC0001234"
                    value={bank.ifsc_code}
                    onChange={(e) => setBank({ ...bank, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs uppercase font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Cancelled Cheque / Passbook */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Cancelled Cheque or Bank Passbook Copy *</h4>
                <p className="text-[11px] text-slate-500">
                  Ensure the image clearly displays your name, account number, and IFSC code.
                </p>
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-xs font-semibold text-slate-700">
                  <LuCloudUpload className="text-blue-600" size={16} />
                  <span>{uploadingFields.cheque_doc_url ? "Uploading..." : "Upload Cancelled Cheque / Passbook"}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, "cheque_doc_url", "bank")}
                    className="hidden"
                  />
                </label>
                {renderFilePreview(bank.cheque_doc_url, "Bank Document", "cheque_doc_url", "bank")}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  <LuArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
                >
                  Next: Education Details <LuArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Educational Qualifications */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <LuGraduationCap className="text-blue-600" /> Step 5: Educational Qualifications
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide your highest completed degree and upload the degree certificate or marksheet.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Highest Qualification</label>
                  <select
                    value={education.highest_qualification}
                    onChange={(e) => setEducation({ ...education, highest_qualification: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Doctorate / Ph.D">Doctorate / Ph.D</option>
                    <option value="Master's Degree (M.Tech, MBA, MCA, M.Sc)">Master's Degree (M.Tech, MBA, MCA, M.Sc)</option>
                    <option value="Bachelor's Degree (B.Tech, BE, BCA, B.Sc, B.Com)">Bachelor's Degree (B.Tech, BE, BCA, B.Sc, B.Com)</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Higher Secondary (10+2)">Higher Secondary (10+2)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Degree / Course Name</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech in Computer Science"
                    value={education.degree_name}
                    onChange={(e) => setEducation({ ...education, degree_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Year of Passing</label>
                  <input
                    type="number"
                    min="1980"
                    max="2030"
                    value={education.passing_year}
                    onChange={(e) => setEducation({ ...education, passing_year: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">College / University Name</label>
                <input
                  type="text"
                  placeholder="e.g. National Institute of Technology, Jadavpur University"
                  value={education.institution}
                  onChange={(e) => setEducation({ ...education, institution: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Marksheet / Degree Certificate */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Final Degree Certificate or Consolidated Marksheet</h4>
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-xs font-semibold text-slate-700">
                  <LuCloudUpload className="text-blue-600" size={16} />
                  <span>{uploadingFields.marksheet_doc_url ? "Uploading..." : "Upload Degree Certificate"}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, "marksheet_doc_url", "education")}
                    className="hidden"
                  />
                </label>
                {renderFilePreview(education.marksheet_doc_url, "Degree Certificate", "marksheet_doc_url", "education")}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  <LuArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
                >
                  Next: Review & E-Sign <LuArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Review, Declaration & E-Signature */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <LuFileCheck className="text-blue-600" /> Step 6: Digital Declaration & Submission
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review your provided details, sign digitally, and complete your pre-joining onboarding submission.
                </p>
              </div>

              {/* Summary Checklist */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Submission Summary Checklist:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600">
                  <div className="flex items-center gap-2">
                    {kyc.pan_number && kyc.pan_doc_url ? (
                      <LuCheck className="text-emerald-600" size={16} />
                    ) : (
                      <LuTriangleAlert className="text-amber-500" size={16} />
                    )}
                    <span>PAN Card: {kyc.pan_number || "Not provided"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {kyc.aadhaar_number && kyc.aadhaar_doc_url ? (
                      <LuCheck className="text-emerald-600" size={16} />
                    ) : (
                      <LuTriangleAlert className="text-amber-500" size={16} />
                    )}
                    <span>Aadhaar: {kyc.aadhaar_number ? `XXXX-XXXX-${kyc.aadhaar_number.slice(-4)}` : "Not provided"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {bank.account_number && bank.cheque_doc_url ? (
                      <LuCheck className="text-emerald-600" size={16} />
                    ) : (
                      <LuTriangleAlert className="text-amber-500" size={16} />
                    )}
                    <span>Bank: {bank.bank_name || "Account entered"} ({bank.ifsc_code || "IFSC"})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {priorEmp.is_fresher || priorEmp.relieving_letter_url || priorEmp.experience_cert_url ? (
                      <LuCheck className="text-emerald-600" size={16} />
                    ) : (
                      <LuTriangleAlert className="text-amber-500" size={16} />
                    )}
                    <span>
                      Prior Experience: {priorEmp.is_fresher ? "Fresher" : priorEmp.company_name || "Relieving letter attached"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal Declaration */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declarationAgreed}
                    onChange={(e) => setDeclarationAgreed(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5 flex-shrink-0"
                  />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900">Legal Declaration & Verification Consent:</strong>
                    <br />
                    I hereby declare that all the information provided in this portal and all documents uploaded (including KYC, relieving certificates, and bank account proofs) are true, authentic, and complete to the best of my knowledge. I understand that any false declaration or fabricated documents may lead to the termination of my offer/employment.
                  </div>
                </label>
              </div>

              {/* Digital Signature */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Digital E-Signature (Type your full legal name) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-[11px] text-slate-400 font-mono">
                    Timestamp: {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  <LuArrowLeft size={14} /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting to HR...</span>
                    </>
                  ) : (
                    <>
                      <LuFileCheck size={18} />
                      <span>Complete & Submit Pre-Joining Documents</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Zentelex HRMS • All information is encrypted via 256-bit TLS security.</p>
        <p className="mt-1">Link validity is strictly limited to 7 days from generation.</p>
      </footer>
    </div>
  );
}
