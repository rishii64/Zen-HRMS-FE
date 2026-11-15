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
  LuPencil,
  LuFileUp,
  LuRotateCcw,
  LuIndianRupee,
  LuCheck,
  LuX,
  LuCircleAlert,
} from "react-icons/lu";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { exportToExcel } from "../../utils/excelExport";
import api, { getUploadUrl } from "../../api";
import Loader from "../../components/Loader/Loader";

// Fallback Coverage Highlights list
const DEFAULT_HIGHLIGHTS = [
  {
    id: 1,
    title: "In-Patient Hospitalization",
    badge: "100% Covered",
    badge_color: "emerald",
    description: "Boarding, nursing care, doctor visits, medicines, oxygen, blood, surgical appliances up to the sum insured.",
    icon: "building",
    order_index: 1,
  },
  {
    id: 2,
    title: "Pre & Post Hospitalization",
    badge: "30 & 60 Days",
    badge_color: "blue",
    description: "Medical expenses incurred 30 days before admission and up to 60 days post-discharge (consultations, scans, tests).",
    icon: "calendar",
    order_index: 2,
  },
  {
    id: 3,
    title: "Day Care Treatments (500+ procedures)",
    badge: "Included",
    badge_color: "indigo",
    description: "Procedures requiring less than 24h hospitalization due to advanced technology (Cataract, Dialysis, Chemotherapy, Radiotherapy).",
    icon: "stethoscope",
    order_index: 3,
  },
  {
    id: 4,
    title: "Maternity & Newborn Cover",
    badge: "Up to ₹75,000",
    badge_color: "rose",
    description: "Normal delivery up to ₹50,000 and Caesarean (C-section) up to ₹75,000. Newborn baby covered from Day 1.",
    icon: "heart",
    order_index: 4,
  },
  {
    id: 5,
    title: "Room Rent & ICU Limits",
    badge: "Single Private / No ICU Cap",
    badge_color: "amber",
    description: "Single private A/C room allowed or 1% of Sum Insured per day. ICU charges covered without sub-limits.",
    icon: "shield",
    order_index: 5,
  },
];

// Fallback Network Hospitals list for cashless assistance lookup
const NETWORK_HOSPITALS = [
  { id: 1, name: "Apollo Hospitals & Heart Centre", city: "Mumbai", area: "CBD Belapur", cashless: true, helpline: "+91 22 3350 3350", hospital_type: "Super Specialty" },
  { id: 2, name: "Fortis Hiranandani Hospital", city: "Navi Mumbai", area: "Vashi", cashless: true, helpline: "+91 22 3919 9222", hospital_type: "Multi Specialty" },
  { id: 3, name: "Kokilaben Dhirubhai Ambani Hospital", city: "Mumbai", area: "Andheri West", cashless: true, helpline: "+91 22 4269 6969", hospital_type: "Quaternary Care" },
  { id: 4, name: "Lilavati Hospital & Research Centre", city: "Mumbai", area: "Bandra West", cashless: true, helpline: "+91 22 2675 1000", hospital_type: "Multi Specialty" },
  { id: 5, name: "Manipal Hospital", city: "Bengaluru", area: "Old Airport Rd", cashless: true, helpline: "+91 80 2502 4444", hospital_type: "Multi Specialty" },
  { id: 6, name: "Max Super Specialty Hospital", city: "Delhi NCR", area: "Saket", cashless: true, helpline: "+91 11 2651 5050", hospital_type: "Super Specialty" },
  { id: 7, name: "Medanta - The Medicity", city: "Gurugram", area: "Sector 38", cashless: true, helpline: "+91 124 414 1414", hospital_type: "Multi Specialty" },
  { id: 8, name: "IRIS MULTISPECIALITY HOSPITAL", city: "Kolkata", area: "Vidyasagar Colony", cashless: true, helpline: "+91 124 414 1414", hospital_type: "Multi Specialty" },
];

const renderHighlightIcon = (iconName) => {
  switch (iconName) {
    case "building":
      return <LuBuilding size={16} />;
    case "calendar":
      return <LuCalendar size={16} />;
    case "stethoscope":
      return <LuStethoscope size={16} />;
    case "heart":
      return <LuHeartPulse size={16} />;
    case "shield":
      return <LuShieldCheck size={16} />;
    case "check":
      return <LuCircleCheck size={16} />;
    case "file":
      return <LuFileText size={16} />;
    default:
      return <LuShieldCheck size={16} />;
  }
};

const getHighlightColorClasses = (colorName) => {
  switch (colorName) {
    case "blue":
      return {
        bg: "bg-blue-50 text-blue-600",
        badge: "bg-blue-600 text-blue-700 border border-blue-200",
      };
    case "indigo":
      return {
        bg: "bg-indigo-50 text-indigo-600",
        badge: "bg-indigo-600 text-indigo-700 border border-indigo-200",
      };
    case "rose":
      return {
        bg: "bg-rose-50 text-rose-600",
        badge: "bg-rose-600 text-rose-700 border border-rose-200",
      };
    case "amber":
      return {
        bg: "bg-amber-50 text-amber-600",
        badge: "bg-amber-600 text-amber-800 border border-amber-200",
      };
    case "purple":
      return {
        bg: "bg-purple-50 text-purple-600",
        badge: "bg-purple-600 text-purple-700 border border-purple-200",
      };
    case "cyan":
      return {
        bg: "bg-cyan-50 text-cyan-600",
        badge: "bg-cyan-600 text-cyan-700 border border-cyan-200",
      };
    case "emerald":
    default:
      return {
        bg: "bg-emerald-50 text-emerald-600",
        badge: "bg-emerald-600 text-emerald-700 border border-emerald-200",
      };
  }
};

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

  // Network Hospital Search & Directory State (Feature 2)
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [hospitalCity, setHospitalCity] = useState("All");
  const [hospitals, setHospitals] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [showUploadHospitalModal, setShowUploadHospitalModal] = useState(false);
  const [uploadingHospitals, setUploadingHospitals] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadMode, setUploadMode] = useState("append"); // 'append' | 'replace'
  const [uploadedHospitalsPreview, setUploadedHospitalsPreview] = useState([]);

  // Single Hospital Modal State
  const [showAddHospitalModal, setShowAddHospitalModal] = useState(false);
  const [singleHospForm, setSingleHospForm] = useState({
    name: "",
    city: "",
    area: "",
    address: "",
    helpline: "",
    hospital_type: "Multi Specialty",
    cashless: true,
  });
  const [savingSingleHosp, setSavingSingleHosp] = useState(false);

  // Coverage Highlights State (Feature 1)
  const [highlights, setHighlights] = useState(DEFAULT_HIGHLIGHTS);
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [showHighlightsModal, setShowHighlightsModal] = useState(false);
  const [editHighlightsList, setEditHighlightsList] = useState([]);
  const [savingHighlights, setSavingHighlights] = useState(false);

  // Employee Total Health Coverage Desk (Feature 3)
  const [showCoverageManagerModal, setShowCoverageManagerModal] = useState(false);
  const [employeesCoverage, setEmployeesCoverage] = useState([]);
  const [loadingCoverageList, setLoadingCoverageList] = useState(false);
  const [coverageSearch, setCoverageSearch] = useState("");
  const [coverageDeptFilter, setCoverageDeptFilter] = useState("All");
  const [coverageDeptList, setCoverageDeptList] = useState([]);

  const [showEditCoverageModal, setShowEditCoverageModal] = useState(false);
  const [selectedEmpCoverage, setSelectedEmpCoverage] = useState(null);
  const [coverageForm, setCoverageForm] = useState({
    sum_insured: 500000,
    plan_type: "Corporate Group Floater Plan (1+3)",
    policy_number: "",
  });
  const [savingCoverage, setSavingCoverage] = useState(false);

  // --- Handlers for Coverage Highlights (Feature 1) ---
  const fetchHighlights = async () => {
    try {
      setLoadingHighlights(true);
      const res = await api.get("/mediclaim/highlights");
      if (res.data?.success && Array.isArray(res.data.highlights) && res.data.highlights.length > 0) {
        setHighlights(res.data.highlights);
      } else {
        setHighlights(DEFAULT_HIGHLIGHTS);
      }
    } catch (err) {
      console.error("Error fetching highlights:", err);
      setHighlights(DEFAULT_HIGHLIGHTS);
    } finally {
      setLoadingHighlights(false);
    }
  };

  const handleSaveHighlights = async () => {
    try {
      setSavingHighlights(true);
      const res = await api.put("/mediclaim/highlights", { highlights: editHighlightsList });
      if (res.data?.success) {
        toast.success("Policy highlights updated successfully!");
        setHighlights(res.data.highlights || editHighlightsList);
        setShowHighlightsModal(false);
      }
    } catch (err) {
      console.error("Error saving highlights:", err);
      toast.error(err.response?.data?.message || "Failed to update coverage highlights");
    } finally {
      setSavingHighlights(false);
    }
  };

  const handleResetHighlights = async () => {
    if (!window.confirm("Are you sure you want to restore the standard default coverage highlights?")) return;
    try {
      setSavingHighlights(true);
      const res = await api.post("/mediclaim/highlights/reset");
      if (res.data?.success) {
        toast.success("Default highlights restored successfully!");
        setHighlights(res.data.highlights || DEFAULT_HIGHLIGHTS);
        setEditHighlightsList(res.data.highlights || DEFAULT_HIGHLIGHTS);
        setShowHighlightsModal(false);
      }
    } catch (err) {
      console.error("Error resetting highlights:", err);
      toast.error("Failed to reset highlights");
    } finally {
      setSavingHighlights(false);
    }
  };

  // --- Handlers for Hospital Directory & Bulk Upload (Feature 2) ---
  const fetchHospitals = async () => {
    try {
      setLoadingHospitals(true);
      const res = await api.get("/mediclaim/hospitals");
      if (res.data?.success) {
        setHospitals(res.data.hospitals || []);
        if (Array.isArray(res.data.cities)) {
          setCitiesList(res.data.cities);
        }
      }
    } catch (err) {
      console.error("Error fetching hospitals:", err);
      toast.error("Failed to load hospital directory");
    } finally {
      setLoadingHospitals(false);
    }
  };

  const handleDownloadHospitalTemplate = () => {
    try {
      const templateData = [
        {
          "Hospital Name": "Apollo Multi-Speciality Hospital",
          City: "Mumbai",
          "Area / Locality": "Bandra West",
          Address: "Hill Road, Bandra West, Mumbai 400050",
          "Contact Helpline": "+91 22 2640 0000",
          "Hospital Type": "Multi Specialty",
          "Cashless Available": "Yes",
        },
        {
          "Hospital Name": "Fortis Memorial Research Institute",
          City: "Delhi NCR",
          "Area / Locality": "Sector 44",
          Address: "Opp. HUDA City Centre Metro, Sector 44, Gurugram 122002",
          "Contact Helpline": "+91 124 496 2200",
          "Hospital Type": "Super Specialty",
          "Cashless Available": "Yes",
        },
        {
          "Hospital Name": "Manipal Hospital",
          City: "Bengaluru",
          "Area / Locality": "Old Airport Road",
          Address: "98 HAL Old Airport Road, Kodihalli, Bengaluru 560017",
          "Contact Helpline": "+91 80 2502 4444",
          "Hospital Type": "Multi Specialty",
          "Cashless Available": "Yes",
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Hospital Directory Template");
      XLSX.writeFile(wb, "mediclaim_hospital_template.xlsx");
      toast.success("Excel template downloaded!");
    } catch (err) {
      console.error("Error downloading template:", err);
      toast.error("Failed to download template");
    }
  };

  const handleHospitalFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setUploadError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!data || data.length === 0) {
          setUploadError("The uploaded file does not contain any rows.");
          setUploadedHospitalsPreview([]);
          return;
        }

        const mapped = data
          .map((row) => {
            const name = row["Hospital Name"] || row["hospital_name"] || row["Name"] || row["name"] || "";
            const city = row["City"] || row["city"] || "";
            const area = row["Area / Locality"] || row["Area"] || row["area"] || row["Locality"] || "";
            const address = row["Address / Landmark"] || row["Address"] || row["address"] || "";
            const helpline = row["Contact Helpline"] || row["Helpline"] || row["helpline"] || row["Phone"] || "";
            const type = row["Hospital Type"] || row["Type"] || row["hospital_type"] || "Multi Specialty";
            const cashlessVal = String(row["Cashless Available"] || row["Cashless"] || row["cashless"] || "Yes").toLowerCase();
            const cashless = !cashlessVal.includes("no") && !cashlessVal.includes("false") && !cashlessVal.includes("0");

            return {
              name: String(name).trim(),
              city: String(city).trim(),
              area: String(area).trim(),
              address: String(address).trim(),
              helpline: String(helpline).trim(),
              hospital_type: String(type).trim() || "Multi Specialty",
              cashless,
            };
          })
          .filter((item) => item.name && item.city);

        if (mapped.length === 0) {
          setUploadError("No valid rows found. Please ensure each row has at least 'Hospital Name' and 'City'.");
          setUploadedHospitalsPreview([]);
          return;
        }

        setUploadedHospitalsPreview(mapped);
      } catch (err) {
        console.error("Error reading file:", err);
        setUploadError("Failed to parse file. Please verify it is a valid .xlsx or .csv spreadsheet.");
        setUploadedHospitalsPreview([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmitHospitalUpload = async () => {
    if (uploadedHospitalsPreview.length === 0) {
      toast.error("No valid hospital records to import");
      return;
    }

    try {
      setUploadingHospitals(true);
      const res = await api.post("/mediclaim/hospitals/upload", {
        hospitals: uploadedHospitalsPreview,
        mode: uploadMode,
      });

      if (res.data?.success) {
        toast.success(res.data.message || `Successfully imported ${uploadedHospitalsPreview.length} hospitals!`);
        setShowUploadHospitalModal(false);
        setUploadedHospitalsPreview([]);
        setUploadFileName("");
        setUploadError("");
        fetchHospitals();
      }
    } catch (err) {
      console.error("Error uploading hospitals:", err);
      toast.error(err.response?.data?.message || "Failed to import hospitals");
    } finally {
      setUploadingHospitals(false);
    }
  };

  const handleSaveSingleHospital = async (e) => {
    e.preventDefault();
    if (!singleHospForm.name.trim() || !singleHospForm.city.trim()) {
      toast.error("Hospital Name and City are required");
      return;
    }

    try {
      setSavingSingleHosp(true);
      const res = await api.post("/mediclaim/hospitals", singleHospForm);
      if (res.data?.success) {
        toast.success(`Hospital "${singleHospForm.name}" added successfully!`);
        setShowAddHospitalModal(false);
        setSingleHospForm({
          name: "",
          city: "",
          area: "",
          address: "",
          helpline: "",
          hospital_type: "Multi Specialty",
          cashless: true,
        });
        fetchHospitals();
      }
    } catch (err) {
      console.error("Error adding hospital:", err);
      toast.error(err.response?.data?.message || "Failed to add hospital");
    } finally {
      setSavingSingleHosp(false);
    }
  };

  const handleDeleteHospital = async (hospId, hospName) => {
    if (!window.confirm(`Are you sure you want to remove "${hospName}" from the network directory?`)) return;
    try {
      const res = await api.delete(`/mediclaim/hospitals/${hospId}`);
      if (res.data?.success) {
        toast.success("Hospital removed from directory");
        fetchHospitals();
      }
    } catch (err) {
      console.error("Error deleting hospital:", err);
      toast.error(err.response?.data?.message || "Failed to delete hospital");
    }
  };

  // --- Handlers for Employee Total Health Coverage (Feature 3) ---
  const fetchEmployeesCoverage = async () => {
    try {
      setLoadingCoverageList(true);
      const params = {};
      if (coverageSearch) params.search = coverageSearch;
      if (coverageDeptFilter && coverageDeptFilter !== "All") params.dept = coverageDeptFilter;

      const res = await api.get("/mediclaim/employees-coverage", { params });
      if (res.data?.success) {
        setEmployeesCoverage(res.data.employees || []);
        if (Array.isArray(res.data.departments) && res.data.departments.length > 0) {
          setCoverageDeptList(res.data.departments);
        }
      }
    } catch (err) {
      console.error("Error fetching employee coverage list:", err);
      toast.error("Failed to load employee coverage records");
    } finally {
      setLoadingCoverageList(false);
    }
  };

  const handleOpenCoverageManager = () => {
    setShowCoverageManagerModal(true);
    fetchEmployeesCoverage();
  };

  const handleOpenEditCoverage = (emp) => {
    setSelectedEmpCoverage(emp);
    setCoverageForm({
      sum_insured: emp.sum_insured || 500000,
      plan_type: emp.plan_type || "Corporate Group Floater Plan (1+3)",
      policy_number: emp.policy_number || "",
    });
    setShowEditCoverageModal(true);
  };

  const handleSaveEmployeeCoverage = async (e) => {
    e.preventDefault();
    if (!selectedEmpCoverage) return;

    try {
      setSavingCoverage(true);
      const res = await api.post("/mediclaim/policy/manage", {
        employee_id: selectedEmpCoverage.employee_id,
        sum_insured: parseFloat(coverageForm.sum_insured) || 500000,
        policy_plan: coverageForm.plan_type,
        policy_no: coverageForm.policy_number,
      });

      if (res.data?.success) {
        toast.success(`Total Health Coverage for ${selectedEmpCoverage.name} updated to ₹${parseFloat(coverageForm.sum_insured).toLocaleString("en-IN")}`);
        setShowEditCoverageModal(false);
        fetchEmployeesCoverage();
        if (selectedEmpCoverage.employee_id === employee?.employee_id) {
          fetchMyMediclaim();
        }
      }
    } catch (err) {
      console.error("Error updating coverage:", err);
      toast.error(err.response?.data?.message || "Failed to update employee coverage");
    } finally {
      setSavingCoverage(false);
    }
  };

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
    fetchHighlights();
    fetchHospitals();
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

    exportToExcel({
      data: dataToExport,
      fileName: `Mediclaim_Claims_Register_${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Mediclaim Claims",
    });
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
  const filteredHospitals = (hospitals || []).filter((h) => {
    const term = (hospitalSearch || "").trim().toLowerCase();
    const nameMatch = (h.name || "").toLowerCase().includes(term);
    const areaMatch = (h.area || "").toLowerCase().includes(term);
    const typeMatch = (h.hospital_type || h.type || "").toLowerCase().includes(term);
    const helplineMatch = (h.helpline || "").toLowerCase().includes(term);
    const cityMatch = (h.city || "").toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || areaMatch || typeMatch || helplineMatch || cityMatch;

    const matchesCity = hospitalCity === "All" || (h.city || "").toLowerCase() === hospitalCity.toLowerCase();
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
    <Container fluid className="px-4 py-4 max-w-7xl" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
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
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">24*7 TPA Emergency Helpline</span>
                <span className="font-bold text-slate-800">{policy?.emergency_helpline || "1800-425-9449"}</span>
              </div>
            </div>

            <Button
              variant="outline-secondary"
              size="sm"
              onClick={fetchMyMediclaim}
              className="d-flex align-items-center gap-1.5 !rounded-xl py-1 px-3 text-xs bg-white shadow-2xs hover:!text-blue-600 hover:!border-blue-600"
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
            <div className="mt-3 pt-2 border-top border-slate-100 d-flex justify-content-between align-items-center text-[11px] text-slate-500">
              <span className="text-truncate" style={{ maxWidth: "120px" }} title={policy?.policy_number}>
                Policy: {policy?.policy_number}
              </span>
              {isHRorAdmin ? (
                <button
                  type="button"
                  onClick={handleOpenCoverageManager}
                  className="text-blue-600 font-semibold text-xs border-0 bg-transparent p-0 hover:underline d-inline-flex align-items-center gap-1"
                  title="Configure Total Health Coverage limit for any employee"
                >
                  <LuPencil size={12} /> Set Coverage
                </button>
              ) : (
                <span className="text-emerald-700 font-bold">Active</span>
              )}
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
        <div className="mediclaim-tabs-wrapper bg-white rounded-2xl p-1.5 text-xs shadow-sm border border-slate-200 mb-4">
          <Nav variant="pills" className="mediclaim-tab-nav d-flex flex-nowrap align-items-center justify-content-around gap-1.5">
            <Nav.Item className="flex-shrink-0">
              <Nav.Link
                eventKey="card"
                className="mediclaim-tab-btn d-flex align-items-center gap-2 rounded-xl py-2 px-2.1 text-xs font-semibold cursor-pointer text-nowrap"
              >
                <LuShieldCheck size={15} className="flex-shrink-0" />
                <span>Digital E-Card & Policy</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="flex-shrink-0">
              <Nav.Link
                eventKey="dependents"
                className="mediclaim-tab-btn d-flex align-items-center gap-2 rounded-xl py-2 px-2.1 text-xs font-semibold cursor-pointer text-nowrap"
              >
                <LuUsers size={15} className="flex-shrink-0" />
                <span>Covered Family ({1 + enrolledDeps.length})</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="flex-shrink-0">
              <Nav.Link
                eventKey="submit_claim"
                className="mediclaim-tab-btn d-flex align-items-center gap-2 rounded-xl py-2 px-2.1 text-xs font-semibold cursor-pointer text-nowrap"
              >
                <LuPlus size={15} className="flex-shrink-0" />
                <span>Submit New Claim</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="flex-shrink-0">
              <Nav.Link
                eventKey="my_claims"
                className="mediclaim-tab-btn d-flex align-items-center gap-2 rounded-xl py-2 px-2.1 text-xs font-semibold cursor-pointer text-nowrap"
              >
                <LuFileText size={15} className="flex-shrink-0" />
                <span>My Claims & Timeline ({claims.length})</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="flex-shrink-0">
              <Nav.Link
                eventKey="network_hospitals"
                className="mediclaim-tab-btn d-flex align-items-center gap-2 rounded-xl py-2 px-2.1 text-xs font-semibold cursor-pointer text-nowrap"
              >
                <LuHospital size={15} className="flex-shrink-0" />
                <span>Cashless Network Hospitals</span>
              </Nav.Link>
            </Nav.Item>

            {/* HR / Admin Review Desk Tab (Only shown to HR/Admin roles) */}
            {isHRorAdmin && (
              <Nav.Item className="flex-shrink-0">
                <Nav.Link
                  eventKey="company_desk"
                  className={`mediclaim-tab-btn d-flex align-items-center gap-2 rounded-xl py-2 px-2 text-xs font-semibold cursor-pointer text-nowrap ${activeTab === "company_desk"
                      ? "mediclaim-desk-active"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                >
                  <LuFileSpreadsheet size={15} className="text-emerald-500 flex-shrink-0" />
                  <span>Company Claims Desk</span>
                  {companyClaims.filter((c) => ["Submitted", "Under Review"].includes(c.status)).length > 0 && (
                    <span className="badge bg-rose-500 rounded-pill text-[10px] px-1.5 py-0.5 ms-0.5">
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
                      className="rounded-lg !text-xs py-1 px-1.5"
                    >
                      {cardFlipped ? "Show Front" : "Show Back"}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => window.print()}
                      className="rounded-lg !text-xs py-1.5 px-2.5 d-flex align-items-center gap-1 bg-blue-600"
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
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold text-slate-800 m-0 text-base d-flex align-items-center gap-2">
                    <LuCircleCheck className="text-blue-600" /> Coverage Highlights & Inclusions
                  </h5>
                  {isHRorAdmin && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        setEditHighlightsList(
                          highlights.length > 0
                            ? JSON.parse(JSON.stringify(highlights))
                            : JSON.parse(JSON.stringify(DEFAULT_HIGHLIGHTS))
                        );
                        setShowHighlightsModal(true);
                      }}
                      className="rounded-xl !text-xs py-1.5 px-3 d-inline-flex align-items-center gap-1.5 font-semibold border-blue-300 hover:bg-blue-50"
                    >
                      <LuPencil size={13} /> Edit Highlights
                    </Button>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  {highlights.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      No coverage highlights configured yet.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {highlights.map((h, idx) => {
                        const colorCls = getHighlightColorClasses(h.badge_color);
                        return (
                          <div
                            key={h.id || idx}
                            className={`d-flex align-items-start gap-3 ${idx < highlights.length - 1 ? "pb-3 border-b border-slate-100" : ""
                              }`}
                          >
                            <div className={`p-2 rounded-xl mt-0.5 ${colorCls.bg}`}>
                              {renderHighlightIcon(h.icon)}
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex justify-content-between align-items-center">
                                <strong className="text-xs text-slate-800">{h.title}</strong>
                                <span className={`badge text-[10px] rounded-pill px-2 py-0.5 font-semibold ${colorCls.badge}`}>
                                  {h.badge}
                                </span>
                              </div>
                              <p className="text-slate-500 text-xs m-0 mt-0.5">
                                {h.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                            className="rounded-xl !text-xs py-2.5"
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
                            className="rounded-xl !text-xs py-2.5 bg-slate-50 text-slate-500"
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
                            className="rounded-xl !text-xs py-2.5"
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
                            className="rounded-xl !text-xs py-2.5"
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
                            className="rounded-xl !text-xs py-2.5"
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
                            className="rounded-xl !text-xs py-2.5"
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
                            className="rounded-xl !text-xs py-2.5"
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
                            className="rounded-xl !text-xs py-2.5"
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
                            className="rounded-xl !text-xs py-2.5"
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
                            className="rounded-xl !text-xs py-2.5 font-bold text-emerald-700"
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
                                className="rounded-xl !text-xs py-2 bg-white"
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
                                  className="rounded-xl !text-xs py-2 bg-white flex-grow-1"
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
                            className="rounded-xl !text-xs py-2"
                          />
                        </Form.Group>
                      </Col>

                      {/* Submit Buttons */}
                      <Col xs={12} className="mt-4 text-end">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={submittingClaim}
                          className="px-4 py-2.5 rounded-xl font-semibold !text-xs bg-rose-600 hover:bg-rose-700 border-rose-600 shadow-sm"
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
                className="rounded-xl !text-xs py-2 px-3 d-flex align-items-center gap-1"
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
                    className="rounded-xl px-4 py-2 !text-xs bg-rose-600 border-rose-600"
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
                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={handleOpenCoverageManager}
                      className="d-flex align-items-center gap-1.5 !rounded-lg !text-xs py-2 px-3 font-semibold text-blue-700 border-blue-300 hover:bg-blue-50"
                    >
                      <LuShieldCheck size={16} /> Set Employee Coverage
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={handleExportClaimsExcel}
                      className="d-flex align-items-center gap-1.5 !rounded-lg !text-xs py-2 px-3 font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                      <LuFileSpreadsheet size={16} /> Excel Export
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={fetchCompanyClaims}
                      className="!rounded-lg !text-xs py-2 px-3 d-inline-flex align-items-center gap-1.5"
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
                        className="rounded-xl !text-xs py-2 ps-5"
                      />
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <Form.Select
                      value={companyStatusFilter}
                      onChange={(e) => setCompanyStatusFilter(e.target.value)}
                      className="rounded-xl !text-xs py-2"
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
                      className="w-100 !rounded-lg !text-xs py-2 bg-blue-600"
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
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-xs text-rose-700 font-semibold d-flex align-items-center gap-1.5">
                    <LuPhoneCall size={14} /> Cashless TPA Desk: 1800-425-9449
                  </div>
                  {isHRorAdmin && (
                    <>
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => {
                          setUploadedHospitalsPreview([]);
                          setUploadFileName("");
                          setUploadError("");
                          setShowUploadHospitalModal(true);
                        }}
                        className="!rounded-lg !text-xs py-1.5 px-3 d-inline-flex align-items-center gap-1.5 font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        <LuFileUp size={14} /> Upload Directory
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setShowAddHospitalModal(true)}
                        className="!rounded-lg !text-xs py-1.5 px-3 d-inline-flex align-items-center gap-1.5 font-semibold"
                      >
                        <LuPlus size={14} /> Add Hospital
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Filter Controls: Categorical City-wise Dropdown & Search */}
              <Row className="g-2 mb-3">
                <Col xs={12} md={7}>
                  <div className="position-relative">
                    <LuSearch className="position-absolute text-slate-400" style={{ top: "11px", left: "12px" }} size={15} />
                    <Form.Control
                      type="text"
                      placeholder="Search hospitals by name, area, locality, or helpline..."
                      value={hospitalSearch}
                      onChange={(e) => setHospitalSearch(e.target.value)}
                      className="!rounded-lg !text-xs py-2 ps-5"
                    />
                  </div>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Select
                    value={hospitalCity}
                    onChange={(e) => setHospitalCity(e.target.value)}
                    className="!rounded-lg !text-xs py-2 fw-semibold"
                  >
                    <option value="All">All Cities ({hospitals.length})</option>
                    {citiesList.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.count})
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col xs={12} md={2} className="d-flex align-items-center justify-content-md-end text-xs text-slate-500">
                  <span>Showing <strong>{filteredHospitals.length}</strong> hospitals</span>
                </Col>
              </Row>

              {/* Categorical Quick City Filter Pills */}
              {citiesList.length > 0 && (
                <div className="d-flex flex-wrap gap-1.5 mb-4 align-items-center">
                  <span className="text-[11px] text-slate-400 fw-bold uppercase me-1">Popular Cities:</span>
                  <button
                    type="button"
                    onClick={() => setHospitalCity("All")}
                    className={`badge rounded-pill border px-2.5 py-1 text-xs cursor-pointer transition-all ${hospitalCity === "All"
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-white text-black border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    All ({hospitals.length})
                  </button>
                  {citiesList.slice(0, 8).map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setHospitalCity(c.name)}
                      className={`badge rounded-pill border px-2.5 py-1 text-xs cursor-pointer transition-all ${hospitalCity.toLowerCase() === c.name.toLowerCase()
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white text-black border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                      {c.name} ({c.count})
                    </button>
                  ))}
                </div>
              )}

              {/* Hospital Cards Grid */}
              {loadingHospitals ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="text-xs text-slate-400 mt-2">Loading hospital directory...</p>
                </div>
              ) : filteredHospitals.length === 0 ? (
                <div className="text-center py-5 bg-slate-50 rounded-2xl border border-slate-200 p-4">
                  <span className="text-3xl mb-2 d-block">🏥</span>
                  <h6 className="fw-bold text-slate-700">No Hospitals Found</h6>
                  <p className="text-slate-400 text-xs m-0">
                    No network hospitals match &quot;{hospitalSearch || hospitalCity}&quot;. Try clearing filters or selecting another city.
                  </p>
                  {(hospitalSearch || hospitalCity !== "All") && (
                    <Button
                      variant="light"
                      size="sm"
                      onClick={() => {
                        setHospitalSearch("");
                        setHospitalCity("All");
                      }}
                      className="mt-3 rounded-xl text-xs px-3"
                    >
                      Reset Filters
                    </Button>
                  )}
                </div>
              ) : (
                <Row className="g-3">
                  {filteredHospitals.map((hosp) => (
                    <Col xs={12} md={6} lg={4} key={hosp.id}>
                      <Card className="border border-slate-200 shadow-2xs rounded-2xl p-3.5 bg-white h-100 hover-card d-flex flex-column justify-content-between position-relative">
                        <div>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <Badge bg="success" className="bg-emerald-100 text-emerald-800 text-[10px] rounded-pill font-semibold px-2 py-0.5">
                              ✓ Cashless Available
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-semibold">{hosp.hospital_type || hosp.type || "Multi Specialty"}</span>
                          </div>
                          <h6 className="fw-bold text-slate-900 m-0 text-sm mb-1">{hosp.name}</h6>
                          <span className="text-xs text-slate-500 d-block">
                            📍 {hosp.area ? `${hosp.area}, ` : ""}{hosp.city}
                          </span>
                          {hosp.address && (
                            <span className="text-[11px] text-slate-400 d-block mt-1 text-truncate" title={hosp.address}>
                              {hosp.address}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-top border-slate-100 d-flex justify-content-between align-items-center text-xs">
                          <div className="d-flex align-items-center gap-1.5">
                            <span className="text-slate-400">Desk:</span>
                            <a href={`tel:${hosp.helpline || "+91 1800 425 9449"}`} className="font-bold text-blue-600 text-decoration-none">
                              {hosp.helpline || "+91 1800 425 9449"}
                            </a>
                          </div>
                          {isHRorAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteHospital(hosp.id, hosp.name)}
                              className="text-slate-400 hover:text-rose-600 border-0 bg-transparent p-1 transition-colors"
                              title="Delete from directory"
                            >
                              <LuTrash2 size={13} />
                            </button>
                          )}
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
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
                className="rounded-xl !text-sm py-2"
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
                    className="rounded-xl !text-sm py-2"
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
                    className="rounded-xl !text-sm py-2"
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
                    className="rounded-xl !text-sm py-2"
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
                    className="rounded-xl !text-sm py-2"
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
              <Button variant="light" size="sm" onClick={() => setShowAddDepModal(false)} className="rounded-xl !text-sm px-3">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={savingDep} className="rounded-xl !text-sm px-4 bg-blue-600">
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
                className="rounded-xl !text-sm py-2"
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
                className="rounded-xl !text-sm py-2"
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
                className="rounded-xl !text-sm py-2"
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

      {/* ============================================================== */}
      {/* MODAL 5: MANAGE COVERAGE HIGHLIGHTS & INCLUSIONS (HR / ADMIN) */}
      {/* ============================================================== */}
      <Modal show={showHighlightsModal} onHide={() => setShowHighlightsModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <div>
            <Modal.Title className="text-base fw-bold text-slate-900 d-flex align-items-center gap-2">
              <LuCircleCheck className="text-blue-600" /> Manage Policy Coverage Highlights
            </Modal.Title>
            <p className="text-slate-400 text-xs m-0 mt-1">
              Configure the coverage benefits and policy inclusions visible to all employees on their Digital E-Card tab.
            </p>
          </div>
        </Modal.Header>
        <Modal.Body className="pt-3 max-h-[75vh] overflow-y-auto">
          <div className="d-flex flex-column gap-3">
            {editHighlightsList.map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 position-relative">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="badge bg-slate-200 text-slate-700 text-[10px] font-bold">
                    Benefit #{idx + 1}
                  </span>
                  {editHighlightsList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editHighlightsList.filter((_, i) => i !== idx);
                        setEditHighlightsList(updated);
                      }}
                      className="text-rose-500 hover:text-rose-700 border-0 bg-transparent p-1 text-xs d-flex align-items-center gap-1"
                    >
                      <LuTrash2 size={13} /> Remove
                    </button>
                  )}
                </div>

                <Row className="g-2 mb-2">
                  <Col xs={12} md={5}>
                    <Form.Group>
                      <Form.Label className="text-[11px] fw-bold text-slate-700">Coverage Title *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. In-Patient Hospitalization"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...editHighlightsList];
                          updated[idx].title = e.target.value;
                          setEditHighlightsList(updated);
                        }}
                        className="rounded-xl text-xs py-1.5"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={6} md={4}>
                    <Form.Group>
                      <Form.Label className="text-[11px] fw-bold text-slate-700">Badge Text *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. 100% Covered"
                        value={item.badge_color}
                        onChange={(e) => {
                          const updated = [...editHighlightsList];
                          updated[idx].badge_color = e.target.value;
                          setEditHighlightsList(updated);
                        }}
                        className="rounded-xl text-xs py-1.5"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={6} md={3}>
                    <Form.Group>
                      <Form.Label className="text-[11px] fw-bold text-slate-700">Badge Color</Form.Label>
                      <Form.Select
                        value={item.badge_color || "emerald"}
                        onChange={(e) => {
                          const updated = [...editHighlightsList];
                          updated[idx].badge_color = e.target.value;
                          setEditHighlightsList(updated);
                        }}
                        className="rounded-xl text-xs py-1.5"
                      >
                        <option value="emerald">Emerald (Green)</option>
                        <option value="blue">Blue (Sky)</option>
                        <option value="indigo">Indigo (Navy)</option>
                        <option value="rose">Rose (Red/Pink)</option>
                        <option value="amber">Amber (Orange)</option>
                        <option value="purple">Purple</option>
                        <option value="cyan">Cyan</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-2">
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label className="text-[11px] fw-bold text-slate-700">Icon Theme</Form.Label>
                      <Form.Select
                        value={item.icon || "shield"}
                        onChange={(e) => {
                          const updated = [...editHighlightsList];
                          updated[idx].icon = e.target.value;
                          setEditHighlightsList(updated);
                        }}
                        className="rounded-xl text-xs py-1.5"
                      >
                        <option value="building">Building / Hospital</option>
                        <option value="calendar">Calendar / Days</option>
                        <option value="stethoscope">Stethoscope / Doctor</option>
                        <option value="heart">Heart / Maternity</option>
                        <option value="shield">Shield / Limits</option>
                        <option value="check">Check / Inclusions</option>
                        <option value="file">File / Summary</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={9}>
                    <Form.Group>
                      <Form.Label className="text-[11px] fw-bold text-slate-700">Description / Policy Details *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Detailed terms of coverage, room rent limits, pre/post stay rules..."
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...editHighlightsList];
                          updated[idx].description = e.target.value;
                          setEditHighlightsList(updated);
                        }}
                        className="rounded-xl text-xs py-1.5"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            ))}

            <div className="d-flex justify-content-between align-items-center pt-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => {
                  setEditHighlightsList([
                    ...editHighlightsList,
                    {
                      title: "New Coverage Benefit",
                      badge: "Included",
                      badge_color: "emerald",
                      description: "Detailed coverage terms and limits for this benefit.",
                      icon: "shield",
                      order_index: editHighlightsList.length + 1,
                    },
                  ]);
                }}
                className="rounded-xl text-xs py-2 px-3 d-inline-flex align-items-center gap-1.5"
              >
                <LuPlus size={14} /> Add Benefit Highlight
              </Button>

              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleResetHighlights}
                className="rounded-xl text-xs py-2 px-3 d-inline-flex align-items-center gap-1.5 text-slate-600"
              >
                <LuRotateCcw size={13} /> Reset to Defaults
              </Button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" size="sm" onClick={() => setShowHighlightsModal(false)} className="rounded-xl text-xs px-3">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveHighlights}
            disabled={savingHighlights}
            className="rounded-xl text-xs px-4 bg-blue-600"
          >
            {savingHighlights ? "Saving Highlights..." : "Save Highlights & Publish"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 6: UPLOAD HOSPITAL DIRECTORY (.xlsx / .csv) (HR / ADMIN) */}
      {/* ============================================================== */}
      <Modal show={showUploadHospitalModal} onHide={() => setShowUploadHospitalModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <div>
            <Modal.Title className="text-base fw-bold text-slate-900 d-flex align-items-center gap-2">
              <LuFileUp className="text-emerald-600" /> Upload Network Hospital Directory
            </Modal.Title>
            <p className="text-slate-400 text-xs m-0 mt-1">
              Bulk upload cashless network hospitals visible to all employees with categorical city filtering.
            </p>
          </div>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {/* Download Template Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
            <div>
              <strong className="text-emerald-900 text-xs d-block">Need a pre-formatted Excel template?</strong>
              <span className="text-emerald-700 text-[11px]">
                Columns: <strong>Hospital Name</strong>, <strong>City</strong>, <strong>Area / Locality</strong>, <strong>Contact Helpline</strong>, <strong>Hospital Type</strong>, <strong>Cashless Available</strong>
              </span>
            </div>
            <Button
              variant="outline-success"
              size="sm"
              onClick={handleDownloadHospitalTemplate}
              className="rounded-xl text-xs py-1.5 px-3 font-semibold d-inline-flex align-items-center gap-1.5 flex-shrink-0 bg-white"
            >
              <LuDownload size={14} /> Download Template (.xlsx)
            </Button>
          </div>

          {/* File Picker Zone */}
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center mb-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <LuUpload size={28} className="text-slate-400 mb-2" />
            <h6 className="fw-bold text-slate-800 text-sm mb-1">
              {uploadFileName ? uploadFileName : "Select or drag Excel / CSV file"}
            </h6>
            <p className="text-slate-400 text-xs mb-3">
              Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
            </p>
            <input
              type="file"
              id="hospitalFileInput"
              accept=".xlsx, .xls, .csv"
              onChange={handleHospitalFileChange}
              className="d-none"
            />
            <label
              htmlFor="hospitalFileInput"
              className="btn btn-primary btn-sm rounded-xl text-xs py-2 px-4 bg-blue-600 cursor-pointer shadow-2xs"
            >
              Browse Computer
            </label>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-3 d-flex align-items-center gap-2">
              <LuCircleAlert size={16} className="flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Upload Mode Selector */}
          <div className="mb-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs fw-bold text-slate-800 d-block mb-2">Import Option:</span>
            <div className="d-flex flex-wrap gap-4 text-xs">
              <Form.Check
                type="radio"
                id="modeAppend"
                label="Append to existing directory (Keep current hospitals and add new records)"
                name="hospitalUploadMode"
                checked={uploadMode === "append"}
                onChange={() => setUploadMode("append")}
              />
              <Form.Check
                type="radio"
                id="modeReplace"
                label="Replace entire directory (Clear current directory and replace with this upload)"
                name="hospitalUploadMode"
                checked={uploadMode === "replace"}
                onChange={() => setUploadMode("replace")}
              />
            </div>
          </div>

          {/* Live Preview Table */}
          {uploadedHospitalsPreview.length > 0 && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-xs fw-bold text-slate-800">
                  Parsed Records Preview ({uploadedHospitalsPreview.length} total rows):
                </span>
                <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5">
                  Valid Spreadsheet Format
                </span>
              </div>
              <div className="table-responsive rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                <Table hover size="sm" className="text-xs mb-0">
                  <thead className="table-light text-slate-600 text-[11px]">
                    <tr>
                      <th>#</th>
                      <th>Hospital Name</th>
                      <th>City</th>
                      <th>Area</th>
                      <th>Helpline</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedHospitalsPreview.slice(0, 10).map((h, idx) => (
                      <tr key={idx}>
                        <td className="text-slate-400">{idx + 1}</td>
                        <td className="fw-semibold text-slate-900">{h.name}</td>
                        <td className="text-slate-700">{h.city}</td>
                        <td className="text-slate-500">{h.area || "—"}</td>
                        <td className="text-blue-600">{h.helpline}</td>
                        <td className="text-slate-500">{h.hospital_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {uploadedHospitalsPreview.length > 10 && (
                <span className="text-[11px] text-slate-400 mt-1 d-block text-end">
                  ...and {uploadedHospitalsPreview.length - 10} more rows
                </span>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" size="sm" onClick={() => setShowUploadHospitalModal(false)} className="rounded-xl text-xs px-3">
            Cancel
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={handleSubmitHospitalUpload}
            disabled={uploadingHospitals || uploadedHospitalsPreview.length === 0}
            className="rounded-xl text-xs px-4 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 font-semibold"
          >
            {uploadingHospitals ? "Importing Directory..." : `Import ${uploadedHospitalsPreview.length} Hospitals`}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 7: ADD SINGLE NETWORK HOSPITAL (HR / ADMIN)             */}
      {/* ============================================================== */}
      <Modal show={showAddHospitalModal} onHide={() => setShowAddHospitalModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base fw-bold text-slate-900 d-flex align-items-center gap-2">
            <LuHospital className="text-blue-600" /> Add Network Hospital
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <Form onSubmit={handleSaveSingleHospital}>
            <Form.Group className="mb-2.5">
              <Form.Label className="text-xs fw-bold text-slate-700">Hospital Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Apollo Multi-Speciality Hospital"
                value={singleHospForm.name}
                onChange={(e) => setSingleHospForm({ ...singleHospForm, name: e.target.value })}
                className="rounded-xl !text-sm py-2"
                required
              />
            </Form.Group>

            <Row className="g-2 mb-2.5">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">City *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. Mumbai, Kolkata, Bengaluru"
                    value={singleHospForm.city}
                    onChange={(e) => setSingleHospForm({ ...singleHospForm, city: e.target.value })}
                    className="rounded-xl !text-sm py-2"
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Area / Locality</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. Bandra West, Salt Lake"
                    value={singleHospForm.area}
                    onChange={(e) => setSingleHospForm({ ...singleHospForm, area: e.target.value })}
                    className="rounded-xl !text-sm py-2"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-2 mb-2.5">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Contact Helpline</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. +91 22 3350 3350"
                    value={singleHospForm.helpline}
                    onChange={(e) => setSingleHospForm({ ...singleHospForm, helpline: e.target.value })}
                    className="rounded-xl !text-sm py-2"
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Hospital Type</Form.Label>
                  <Form.Select
                    value={singleHospForm.hospital_type}
                    onChange={(e) => setSingleHospForm({ ...singleHospForm, hospital_type: e.target.value })}
                    className="rounded-xl !text-sm py-2"
                  >
                    <option value="Multi Specialty">Multi Specialty</option>
                    <option value="Super Specialty">Super Specialty</option>
                    <option value="Quaternary Care">Quaternary Care</option>
                    <option value="General Hospital">General Hospital</option>
                    <option value="Eye & Dental Specialty">Eye & Dental Specialty</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="text-xs fw-bold text-slate-700">Address / Landmark</Form.Label>
              <Form.Control
                type="text"
                placeholder="Full street address..."
                value={singleHospForm.address}
                onChange={(e) => setSingleHospForm({ ...singleHospForm, address: e.target.value })}
                className="rounded-xl !text-sm py-2"
              />
            </Form.Group>

            <Form.Check
              type="checkbox"
              id="cashlessCheck"
              label="Cashless Hospitalization Available"
              checked={singleHospForm.cashless}
              onChange={(e) => setSingleHospForm({ ...singleHospForm, cashless: e.target.checked })}
              className="text-xs mb-3 text-slate-700 fw-semibold"
            />

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="light" size="sm" onClick={() => setShowAddHospitalModal(false)} className="rounded-xl text-xs px-3">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={savingSingleHosp} className="rounded-xl text-xs px-4 bg-blue-600">
                {savingSingleHosp ? "Saving..." : "Add to Directory"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 8: MANAGE EMPLOYEE TOTAL HEALTH COVERAGE (HR DESK)      */}
      {/* ============================================================== */}
      <Modal show={showCoverageManagerModal} onHide={() => setShowCoverageManagerModal(false)} size="xl" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <div>
            <Modal.Title className="text-base fw-bold text-slate-900 d-flex align-items-center gap-2">
              <LuShieldCheck className="text-blue-600" /> Employee Total Health Coverage Management
            </Modal.Title>
            <p className="text-slate-400 text-xs m-0 mt-1">
              Configure and adjust the Total Health Coverage (Sum Insured) and policy plan individually for each company employee.
            </p>
          </div>
        </Modal.Header>
        <Modal.Body className="pt-3 max-h-[75vh] overflow-y-auto">
          {/* Search & Department Filters */}
          <Row className="g-2 mb-3">
            <Col xs={12} md={6}>
              <div className="position-relative">
                <LuSearch className="position-absolute text-slate-400" style={{ top: "11px", left: "12px" }} size={15} />
                <Form.Control
                  type="text"
                  placeholder="Search employee by name, ID, or email..."
                  value={coverageSearch}
                  onChange={(e) => setCoverageSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchEmployeesCoverage()}
                  className="rounded-xl !text-xs py-2 ps-5"
                />
              </div>
            </Col>
            <Col xs={6} md={3}>
              <Form.Select
                value={coverageDeptFilter}
                onChange={(e) => {
                  setCoverageDeptFilter(e.target.value);
                }}
                className="rounded-xl !text-xs py-2"
              >
                <option value="All">All Departments</option>
                {(coverageDeptList.length > 0 ? coverageDeptList : Array.from(new Set(employeesCoverage.map((e) => e.department).filter(Boolean)))).map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={6} md={3} className="d-flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={fetchEmployeesCoverage}
                className="w-100 rounded-xl !text-xs py-2 bg-blue-600"
              >
                Apply
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  setCoverageSearch("");
                  setCoverageDeptFilter("All");
                  fetchEmployeesCoverage();
                }}
                className="rounded-xl text-xs py-2 px-3"
                title="Reset filters"
              >
                <LuRotateCcw size={14} />
              </Button>
            </Col>
          </Row>

          {/* Employees Coverage Table */}
          {loadingCoverageList ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-xs text-slate-400 mt-2">Loading employee health coverage list...</p>
            </div>
          ) : employeesCoverage.length === 0 ? (
            <div className="text-center py-5 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
              No employees found matching &quot;{coverageSearch || coverageDeptFilter}&quot;.
            </div>
          ) : (
            <div className="table-responsive rounded-2xl border border-slate-200 shadow-2xs">
              <Table hover className="align-middle text-xs mb-0 bg-white">
                <thead className="table-light text-slate-600 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th>Employee</th>
                    <th>Department & Designation</th>
                    <th>Policy Number</th>
                    <th>Plan Type</th>
                    <th>Total Health Coverage</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesCoverage.map((emp) => (
                    <tr key={emp.employee_id}>
                      <td>
                        <div className="d-flex align-items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold d-flex align-items-center justify-content-center text-xs flex-shrink-0">
                            {emp.name ? emp.name.charAt(0).toUpperCase() : "E"}
                          </div>
                          <div>
                            <strong className="text-slate-900 d-block">{emp.name}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">{emp.employee_id} • {emp.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="fw-semibold text-slate-800 d-block">{emp.department}</span>
                        <span className="text-[10px] text-slate-400">{emp.designation}</span>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-slate-700">{emp.policy_number}</span>
                      </td>
                      <td>
                        <span className="badge bg-slate-200 text-black text-[10px] rounded-pill">
                          {emp.plan_type}
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-sm text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 d-inline-block">
                          ₹{(emp.sum_insured || 500000).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="text-end">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleOpenEditCoverage(emp)}
                          className="rounded-xl !text-xs py-1 px-3 d-inline-flex align-items-center gap-1 font-semibold"
                        >
                          <LuPencil size={12} /> Set Coverage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" className="!text-xs px-4" size="sm" onClick={() => setShowCoverageManagerModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 9: SET TOTAL HEALTH COVERAGE (SUM INSURED) FOR EMPLOYEE  */}
      {/* ============================================================== */}
      <Modal show={showEditCoverageModal} onHide={() => setShowEditCoverageModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base fw-bold text-slate-900 d-flex align-items-center gap-2">
            <LuIndianRupee className="text-blue-600" /> Set Total Health Coverage
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          {selectedEmpCoverage && (
            <Form onSubmit={handleSaveEmployeeCoverage}>
              {/* Employee Summary Card */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-3 text-xs">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold d-flex align-items-center justify-content-center text-xs">
                    {selectedEmpCoverage.name.charAt(0)}
                  </div>
                  <div>
                    <strong className="text-slate-900 text-sm">{selectedEmpCoverage.name}</strong>
                    <span className="text-[10px] text-slate-400 ms-2 font-mono">({selectedEmpCoverage.employee_id})</span>
                  </div>
                </div>
                <div className="text-slate-500 text-[11px] mt-1">
                  Department: <strong>{selectedEmpCoverage.department}</strong> &nbsp;•&nbsp; Designation: {selectedEmpCoverage.designation}
                </div>
              </div>

              {/* Quick Amount Presets */}
              <Form.Group className="mb-3">
                <Form.Label className="text-xs fw-bold text-slate-700 d-flex justify-content-between align-items-center">
                  <span>Quick Coverage Presets:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click to auto-fill</span>
                </Form.Label>
                <div className="d-flex flex-wrap gap-1.5">
                  {[300000, 500000, 750000, 1000000, 1500000, 2000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCoverageForm({ ...coverageForm, sum_insured: amt })}
                      className={`btn btn-sm rounded-xl text-xs py-1 px-2.5 font-semibold transition-all ${parseFloat(coverageForm.sum_insured) === amt
                          ? "btn-primary shadow-2xs"
                          : "btn-outline-secondary bg-white text-slate-700"
                        }`}
                    >
                      ₹{(amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1)} Lakhs
                    </button>
                  ))}
                </div>
              </Form.Group>

              {/* Custom Sum Insured Input */}
              <Form.Group className="mb-2.5">
                <Form.Label className="text-xs fw-bold text-slate-700">Total Health Coverage Limit (₹ Sum Insured) *</Form.Label>
                <div className="position-relative">
                  <span className="position-absolute text-slate-400 font-bold" style={{ top: "9px", left: "14px" }}>
                    ₹
                  </span>
                  <Form.Control
                    type="number"
                    min="50000"
                    step="25000"
                    value={coverageForm.sum_insured}
                    onChange={(e) => setCoverageForm({ ...coverageForm, sum_insured: e.target.value })}
                    className="rounded-xl !text-sm py-2 ps-5 font-bold text-emerald-700"
                    required
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 d-flex justify-content-between">
                  <span>Standard corporate floater limit: ₹5,00,000</span>
                  <strong className="text-slate-700">₹{parseFloat(coverageForm.sum_insured || 0).toLocaleString("en-IN")}</strong>
                </div>
              </Form.Group>

              {/* Plan Type Selection */}
              <Form.Group className="mb-2.5">
                <Form.Label className="text-xs fw-bold text-slate-700">Policy Plan Type</Form.Label>
                <Form.Select
                  value={coverageForm.plan_type}
                  onChange={(e) => setCoverageForm({ ...coverageForm, plan_type: e.target.value })}
                  className="rounded-xl !text-sm py-2"
                >
                  <option value="Corporate Group Floater Plan (1+3)">Corporate Group Floater Plan (1+3)</option>
                  <option value="Executive Health Plan (1+5)">Executive Health Plan (1+5)</option>
                  <option value="Individual Staff Cover (Self Only)">Individual Staff Cover (Self Only)</option>
                  <option value="Senior Leadership Comprehensive Care (1+5)">Senior Leadership Comprehensive Care (1+5)</option>
                </Form.Select>
              </Form.Group>

              {/* Policy Number */}
              <Form.Group className="mb-3">
                <Form.Label className="text-xs fw-bold text-slate-700">Policy Number</Form.Label>
                <Form.Control
                  type="text"
                  value={coverageForm.policy_number}
                  onChange={(e) => setCoverageForm({ ...coverageForm, policy_number: e.target.value })}
                  className="rounded-xl !text-sm py-2 font-mono"
                  placeholder="GHI-ZEN-2025-XXXX"
                />
              </Form.Group>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Button variant="light" size="sm" onClick={() => setShowEditCoverageModal(false)} className="rounded-xl text-xs px-3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={savingCoverage} className="rounded-xl text-xs px-4 bg-blue-600">
                  {savingCoverage ? "Saving..." : "Save & Update Coverage"}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      <style>{`
        .mediclaim-tabs-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .mediclaim-tabs-wrapper::-webkit-scrollbar {
          display: none;
        }
        .mediclaim-tab-nav {
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-width: max-content;
        }
        .mediclaim-tab-btn {
          white-space: nowrap !important;
          text-decoration: none !important;
          transition: all 0.15s ease-in-out;
        }
        .mediclaim-tab-btn:not(.active):not(.mediclaim-desk-active) {
          color: #475569 !important;
          background: transparent;
        }
        .mediclaim-tab-btn:not(.active):not(.mediclaim-desk-active):hover {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }
        .nav-pills .nav-link.active.mediclaim-tab-btn {
          background-color: #2563eb !important;
          color: #ffffff !important;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        }
        .mediclaim-desk-active {
          background-color: #0f172a !important;
          color: #ffffff !important;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.35);
        }
      `}</style>
    </Container>
  );
}
