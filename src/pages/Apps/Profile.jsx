// Employee Profile Page (Apps/Profile.jsx)
import React, { useEffect, useState, useMemo } from "react";
import { Form, Button, Card, Container, Row, Col, Table, Badge, Spinner } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaClipboardList,
  FaBriefcase,
  FaHistory,
  FaBuilding,
  FaGraduationCap,
  FaCertificate,
  FaUsers,
  FaPassport,
  FaUniversity,
  FaFolderOpen,
  FaCheckCircle,
  FaClock,
  FaCalculator,
  FaCalendarAlt,
  FaIdCard,
  FaFileAlt,
  FaPlus,
  FaTrash,
  FaExternalLinkAlt,
  FaUpload,
  FaFileInvoice,
  FaIdBadge
} from "react-icons/fa";
import { getApiBaseUrl, getUploadUrl, UPLOADS_BASE } from "../../api/axios";

const API = getApiBaseUrl();

// --- Tenure & Age Calculation Utilities ---
function calculateTenure(joiningDateStr, resignDateStr) {
  if (!joiningDateStr || !resignDateStr) return "";
  const start = new Date(joiningDateStr);
  const end = new Date(resignDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return "";

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? "Day" : "Days"}`);

  return parts.join(" ");
}

function calculateAgeFromDob(dobStr) {
  if (!dobStr) return "";
  const birth = new Date(dobStr);
  if (isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? String(age) : "0";
}

// --- Experience Calculation Utilities ---
function parseExperienceToMonths(str) {
  if (!str || typeof str !== "string") return 0;
  const clean = str.trim().toLowerCase();
  if (!clean || clean === "0" || clean === "fresher" || clean === "none" || clean === "n/a") return 0;

  let totalMonths = 0;
  let matched = false;

  const yrMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?|y\b)/);
  const moMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:months?|mos?|m\b)/);

  if (yrMatch) {
    totalMonths += parseFloat(yrMatch[1]) * 12;
    matched = true;
  }
  if (moMatch) {
    totalMonths += parseFloat(moMatch[1]);
    matched = true;
  }

  if (!matched) {
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      totalMonths = num * 12;
      matched = true;
    }
  }
  return Math.max(0, totalMonths);
}

function calculateCurrentExperience(joiningDateStr, exitDateStr = null, isResigned = false) {
  if (!joiningDateStr) {
    return {
      formatted: "Joining date not recorded",
      shortFormatted: "N/A",
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      status: "missing"
    };
  }

  const start = new Date(joiningDateStr);
  if (isNaN(start.getTime())) {
    return {
      formatted: "Invalid joining date",
      shortFormatted: "Invalid",
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      status: "invalid"
    };
  }

  const end = isResigned && exitDateStr ? new Date(exitDateStr) : new Date();
  if (isNaN(end.getTime())) {
    return {
      formatted: "Invalid exit date",
      shortFormatted: "Invalid",
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      status: "invalid"
    };
  }

  if (end < start) {
    return {
      formatted: "Joining in future",
      shortFormatted: "Upcoming",
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      status: "future"
    };
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? "Day" : "Days"}`);

  const shortParts = [];
  if (years > 0) shortParts.push(`${years}y`);
  if (months > 0) shortParts.push(`${months}m`);
  if (days > 0 && years === 0) shortParts.push(`${days}d`);

  const exactMonths = years * 12 + months + days / 30.4375;
  return {
    formatted: parts.join(", "),
    shortFormatted: shortParts.length ? shortParts.join(" ") : `${days}d`,
    years,
    months,
    days,
    totalMonths: exactMonths,
    status: isResigned ? "resigned" : "active",
    endDateFormatted: end.toISOString().split("T")[0]
  };
}

function calculateTotalCombinedExperience(previousExpStr, currentExpObj) {
  const prevMonths = parseExperienceToMonths(previousExpStr);
  const currentMonths = currentExpObj?.totalMonths || 0;
  const totalMonths = prevMonths + currentMonths;

  if (totalMonths <= 0) return "0 Months";

  const years = Math.floor(totalMonths / 12);
  const remainingMonths = Math.floor(totalMonths % 12);
  const remainingDays = currentExpObj?.days ? Math.round(currentExpObj.days) : 0;

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  if (remainingMonths > 0) parts.push(`${remainingMonths} ${remainingMonths === 1 ? "Month" : "Months"}`);
  if (remainingDays > 0 && years < 10) parts.push(`${remainingDays} ${remainingDays === 1 ? "Day" : "Days"}`);

  return parts.length ? parts.join(", ") : "0 Months";
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch (_) {
    return dateStr;
  }
}

export default function Profile() {
  const { employeeid } = useParams();
  const navigate = useNavigate();
  const activeEmpId = !employeeid || employeeid === "me"
    ? localStorage.getItem("employeeCode") || localStorage.getItem("empId") || "me"
    : employeeid;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empData, setEmpData] = useState(null);

  // Profile forms state
  const [personal, setPersonal] = useState({
    dob: "",
    gender: "Male",
    nationality: "",
    personal_email: "",
    address_current: "",
    address_permanent: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    blood_group: "",
    religion: "",
    previous_experience: "",
    total_experience: "",
    marital_status: "Single"
  });

  const [previousExperienceList, setPreviousExperienceList] = useState([]);
  const [educationList, setEducationList] = useState([]);
  const [certificationList, setCertificationList] = useState([]);

  const [family, setFamily] = useState({
    father_name: "",
    father_dob: "",
    father_age: "",
    mother_name: "",
    mother_dob: "",
    mother_age: "",
    spouse_name: "",
    spouse_dob: "",
    spouse_age: "",
    contact: ""
  });
  const [childrenList, setChildrenList] = useState([]);

  const [passportVisa, setPassportVisa] = useState({
    passport_no: "",
    passport_issue: "",
    passport_expiry: "",
    visa_type: "N/A",
    visa_expiry: "",
    driving_license: "",
    driving_license_expiry: ""
  });

  const [bankDetails, setBankDetails] = useState({
    bank_name: "",
    account_holder: "",
    account_no: "",
    ifsc_code: "",
    branch_name: "",
    pan_number: ""
  });

  const [lastCompanyDetails, setLastCompanyDetails] = useState("");

  // Files state (single files)
  const [files, setFiles] = useState({
    doc_resume: null,
    doc_id: null,
    doc_cert: null,
    profile_photo: null,
    doc_pan: null,
    doc_aadhaar: null
  });

  // Multiple files state
  const [multiFiles, setMultiFiles] = useState({
    doc_payslips: [],
    doc_exp_cert: [],
    doc_last_company: [],
    uploaded_documents: []
  });

  const [existingPayslips, setExistingPayslips] = useState([]);
  const [existingExpCerts, setExistingExpCerts] = useState([]);
  const [existingLastCompanyDocs, setExistingLastCompanyDocs] = useState([]);

  // Load existing profile details
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API}/employee/${activeEmpId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.employee) {
          const emp = data.employee;
          setEmpData(emp);

          // Populate personal details
          setPersonal({
            dob: emp.dob ? emp.dob.split("T")[0] : "",
            gender: emp.gender || "Male",
            nationality: emp.nationality || "",
            personal_email: emp.personal_email || "",
            address_current: emp.address_current || "",
            address_permanent: emp.address_permanent || "",
            emergency_contact_name: emp.emergency_contact_name || "",
            emergency_contact_phone: emp.emergency_contact_phone || "",
            blood_group: emp.blood_group || "",
            religion: emp.religion || "",
            previous_experience: emp.previous_experience || emp.total_experience || "",
            total_experience: emp.total_experience || "",
            marital_status: emp.marital_status || "Single"
          });

          // Parse previous experience (structured JSON array or legacy string)
          try {
            if (emp.previous_experience && typeof emp.previous_experience === "string" && emp.previous_experience.trim().startsWith("[")) {
              const parsed = JSON.parse(emp.previous_experience);
              if (Array.isArray(parsed)) {
                setPreviousExperienceList(parsed);
              }
            } else if (emp.previous_experience && emp.previous_experience.trim()) {
              setPreviousExperienceList([
                {
                  company_name: "Previous Company",
                  designation: emp.designation || "",
                  joining_date: "",
                  resign_date: "",
                  total_experience: emp.previous_experience,
                  reporting_manager: "",
                  reporting_manager_designation: ""
                }
              ]);
            } else {
              setPreviousExperienceList([]);
            }
          } catch (_) {
            setPreviousExperienceList([]);
          }

          // Parse education JSON (with college_university and joining_year)
          try {
            if (emp.education) {
              const edu = typeof emp.education === "string" ? JSON.parse(emp.education) : emp.education;
              if (Array.isArray(edu)) {
                setEducationList(edu.map((e) => ({
                  degree: e.degree || "",
                  college_university: e.college_university || e.university || "",
                  institution: e.institution || e.board || "",
                  joining_year: e.joining_year || "",
                  year: e.year || e.passing_year || "",
                  gpa: e.gpa || e.percentage || ""
                })));
              }
            } else {
              setEducationList([]);
            }
          } catch (e) {
            setEducationList([]);
          }

          // Parse certifications JSON
          try {
            if (emp.certifications) {
              setCertificationList(typeof emp.certifications === "string" ? JSON.parse(emp.certifications) : emp.certifications);
            } else {
              setCertificationList([]);
            }
          } catch (e) {
            setCertificationList([]);
          }

          // Parse family JSON (with father/mother DOB & age, spouse auto-calibration)
          try {
            if (emp.family_details) {
              const fam = typeof emp.family_details === "string" ? JSON.parse(emp.family_details) : emp.family_details;
              const fDob = fam.father_dob ? fam.father_dob.split("T")[0] : "";
              const mDob = fam.mother_dob ? fam.mother_dob.split("T")[0] : "";
              const sDob = fam.spouse_dob ? fam.spouse_dob.split("T")[0] : "";
              setFamily({
                father_name: fam.father_name || "",
                father_dob: fDob,
                father_age: fam.father_age || (fDob ? calculateAgeFromDob(fDob) : ""),
                mother_name: fam.mother_name || "",
                mother_dob: mDob,
                mother_age: fam.mother_age || (mDob ? calculateAgeFromDob(mDob) : ""),
                spouse_name: fam.spouse_name || "",
                spouse_dob: sDob,
                spouse_age: fam.spouse_age || (sDob ? calculateAgeFromDob(sDob) : ""),
                contact: fam.contact || ""
              });
              if (fam.children) {
                setChildrenList(Array.isArray(fam.children) ? fam.children : []);
              }
            }
          } catch (e) {
            // keep defaults
          }

          // Parse Passport & Visa JSON (with driving license)
          try {
            if (emp.passport_visa) {
              const pv = typeof emp.passport_visa === "string" ? JSON.parse(emp.passport_visa) : emp.passport_visa;
              setPassportVisa({
                passport_no: pv.passport_no || "",
                passport_issue: pv.passport_issue ? pv.passport_issue.split("T")[0] : "",
                passport_expiry: pv.passport_expiry ? pv.passport_expiry.split("T")[0] : "",
                visa_type: pv.visa_type || "N/A",
                visa_expiry: pv.visa_expiry ? pv.visa_expiry.split("T")[0] : "",
                driving_license: pv.driving_license || emp.driving_license || "",
                driving_license_expiry: pv.driving_license_expiry ? pv.driving_license_expiry.split("T")[0] : ""
              });
            } else if (emp.driving_license) {
              setPassportVisa((prev) => ({ ...prev, driving_license: emp.driving_license }));
            }
          } catch (e) {
            // keep defaults
          }

          // Parse Bank Details JSON
          try {
            if (emp.bank_details) {
              const bd = typeof emp.bank_details === "string" ? JSON.parse(emp.bank_details) : emp.bank_details;
              setBankDetails({
                bank_name: bd.bank_name || "",
                account_holder: bd.account_holder || "",
                account_no: bd.account_no || "",
                ifsc_code: bd.ifsc_code || "",
                branch_name: bd.branch_name || "",
                pan_number: bd.pan_number || bd.pan || emp.pan_no || emp.pan || ""
              });
            } else if (emp.pan_no) {
              setBankDetails((prev) => ({ ...prev, pan_number: emp.pan_no }));
            }
          } catch (e) {
            // keep defaults
          }

          // Last company details and documents
          setLastCompanyDetails(emp.last_company_details || "");
          try {
            if (emp.doc_payslips) {
              const slips = typeof emp.doc_payslips === "string" ? JSON.parse(emp.doc_payslips) : emp.doc_payslips;
              setExistingPayslips(Array.isArray(slips) ? slips : []);
            }
          } catch (_) {}
          try {
            if (emp.doc_exp_cert) {
              const certs = typeof emp.doc_exp_cert === "string" ? JSON.parse(emp.doc_exp_cert) : emp.doc_exp_cert;
              setExistingExpCerts(Array.isArray(certs) ? certs : []);
            }
          } catch (_) {}
          try {
            if (emp.doc_last_company) {
              const docs = typeof emp.doc_last_company === "string" ? JSON.parse(emp.doc_last_company) : emp.doc_last_company;
              setExistingLastCompanyDocs(Array.isArray(docs) ? docs : []);
            }
          } catch (_) {}
        } else {
          toast.error("Employee profile not found");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load profile details");
      })
      .finally(() => setLoading(false));
  }, [employeeid, activeEmpId]);

  // Real-time calculation of current organization experience (works for all roles)
  const isResigned = useMemo(() => {
    if (!empData) return false;
    const statusLower = String(empData.status || "").toLowerCase().trim();
    if (statusLower === "resigned" || statusLower === "relieved" || statusLower === "separated") {
      return true;
    }
    if (statusLower === "active" || empData.is_active === true) {
      return false;
    }
    return Boolean(empData.is_active === false && empData.is_resigned);
  }, [empData]);

  const exitDate = useMemo(() => {
    if (!empData || !isResigned) return null;
    return empData.relieving_date || empData.last_working_date || empData.resignation_date || null;
  }, [empData, isResigned]);

  const currentExperience = useMemo(() => {
    return calculateCurrentExperience(empData?.joining_date, exitDate, isResigned);
  }, [empData?.joining_date, exitDate, isResigned]);

  // Dynamically compute total previous experience string from previousExperienceList
  const computedPreviousExperienceText = useMemo(() => {
    if (previousExperienceList.length === 0) {
      return personal.previous_experience || "0 Months";
    }
    let totalMonths = 0;
    previousExperienceList.forEach((item) => {
      if (item.joining_date && item.resign_date) {
        const tenureStr = calculateTenure(item.joining_date, item.resign_date);
        totalMonths += parseExperienceToMonths(tenureStr);
      } else if (item.total_experience) {
        totalMonths += parseExperienceToMonths(item.total_experience);
      }
    });
    const years = Math.floor(totalMonths / 12);
    const months = Math.round(totalMonths % 12);
    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
    return parts.length ? parts.join(", ") : "0 Months";
  }, [previousExperienceList, personal.previous_experience]);

  const totalExperience = useMemo(() => {
    return calculateTotalCombinedExperience(computedPreviousExperienceText, currentExperience);
  }, [computedPreviousExperienceText, currentExperience]);

  const handlePersonalChange = (e) => {
    setPersonal({ ...personal, [e.target.name]: e.target.value });
  };

  // Previous work experience handlers
  const handleAddPreviousExp = () => {
    setPreviousExperienceList((prev) => [
      ...prev,
      {
        company_name: "",
        designation: "",
        joining_date: "",
        resign_date: "",
        total_experience: "",
        reporting_manager: "",
        reporting_manager_designation: ""
      }
    ]);
  };

  const handleRemovePreviousExp = (index) => {
    setPreviousExperienceList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePreviousExpChange = (index, field, value) => {
    setPreviousExperienceList((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === "joining_date" || field === "resign_date") {
        const jDate = field === "joining_date" ? value : item.joining_date;
        const rDate = field === "resign_date" ? value : item.resign_date;
        if (jDate && rDate) {
          item.total_experience = calculateTenure(jDate, rDate);
        }
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleFamilyChange = (e) => {
    const { name, value } = e.target;
    setFamily((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "father_dob") {
        updated.father_age = calculateAgeFromDob(value);
      } else if (name === "mother_dob") {
        updated.mother_age = calculateAgeFromDob(value);
      } else if (name === "spouse_dob") {
        updated.spouse_age = calculateAgeFromDob(value);
      }
      return updated;
    });
  };

  const isSingle = (personal.marital_status || "Single").toLowerCase() === "single";

  const handlePassportVisaChange = (e) => {
    setPassportVisa({ ...passportVisa, [e.target.name]: e.target.value });
  };

  const handleBankDetailsChange = (e) => {
    const { name, value } = e.target;
    const formattedVal = name === "pan_number" || name === "ifsc_code" ? value.toUpperCase() : value;
    setBankDetails({ ...bankDetails, [name]: formattedVal });
  };

  // Education handlers
  const handleAddEducation = () => {
    setEducationList([
      ...educationList,
      { degree: "", college_university: "", institution: "", joining_year: "", year: "", gpa: "" }
    ]);
  };

  const handleRemoveEducation = (index) => {
    const list = [...educationList];
    list.splice(index, 1);
    setEducationList(list);
  };

  const handleEducationChange = (index, field, value) => {
    const list = [...educationList];
    list[index][field] = value;
    setEducationList(list);
  };

  // Certifications handlers
  const handleAddCertification = () => {
    setCertificationList([...certificationList, { title: "", issuer: "", issue_date: "", credential_id: "" }]);
  };

  const handleRemoveCertification = (index) => {
    const list = [...certificationList];
    list.splice(index, 1);
    setCertificationList(list);
  };

  const handleCertificationChange = (index, field, value) => {
    const list = [...certificationList];
    list[index][field] = value;
    setCertificationList(list);
  };

  // Children details handlers
  const handleAddChild = () => {
    setChildrenList([...childrenList, { name: "", dob: "", gender: "Male" }]);
  };

  const handleRemoveChild = (index) => {
    const list = [...childrenList];
    list.splice(index, 1);
    setChildrenList(list);
  };

  const handleChildChange = (index, field, value) => {
    const list = [...childrenList];
    list[index][field] = value;
    setChildrenList(list);
  };

  const handleFileChange = (e) => {
    setFiles({ ...files, [e.target.name]: e.target.files[0] });
  };

  const handleMultiFileChange = (field, e) => {
    const newFiles = Array.from(e.target.files || []);
    setMultiFiles((prev) => ({
      ...prev,
      [field]: [...prev[field], ...newFiles]
    }));
  };

  const handleRemoveMultiFile = (field, index) => {
    setMultiFiles((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, idx) => idx !== index)
    }));
  };

  const handleRemoveExistingDoc = (type, index) => {
    if (type === "payslips") {
      setExistingPayslips((prev) => prev.filter((_, idx) => idx !== index));
    } else if (type === "exp_certs") {
      setExistingExpCerts((prev) => prev.filter((_, idx) => idx !== index));
    } else if (type === "last_company") {
      setExistingLastCompanyDocs((prev) => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append("dob", personal.dob);
    formData.append("gender", personal.gender);
    formData.append("nationality", personal.nationality);
    formData.append("personal_email", personal.personal_email || "");
    formData.append("address_current", personal.address_current);
    formData.append("address_permanent", personal.address_permanent);
    formData.append("emergency_contact_name", personal.emergency_contact_name);
    formData.append("emergency_contact_phone", personal.emergency_contact_phone);
    formData.append("blood_group", personal.blood_group);
    formData.append("religion", personal.religion);

    // Previous and total experience
    const prevExpPayload = previousExperienceList.length > 0
      ? JSON.stringify(previousExperienceList)
      : (personal.previous_experience || "");
    formData.append("previous_experience", prevExpPayload);
    formData.append("total_experience", totalExperience || computedPreviousExperienceText || "");
    formData.append("marital_status", personal.marital_status);
    formData.append("education", JSON.stringify(educationList));
    formData.append("certifications", JSON.stringify(certificationList));
    formData.append("family_details", JSON.stringify({ ...family, children: childrenList }));
    formData.append("passport_visa", JSON.stringify(passportVisa));
    formData.append("bank_details", JSON.stringify(bankDetails));

    // Top-level identity and additional fields
    if (passportVisa.driving_license) {
      formData.append("driving_license", passportVisa.driving_license);
    }
    if (bankDetails.pan_number) {
      formData.append("pan_no", bankDetails.pan_number);
    }
    formData.append("last_company_details", lastCompanyDetails || "");

    // Single files
    if (files.doc_resume) formData.append("doc_resume", files.doc_resume);
    if (files.doc_id) formData.append("doc_id", files.doc_id);
    if (files.doc_cert) formData.append("doc_cert", files.doc_cert);
    if (files.profile_photo) formData.append("profile_photo", files.profile_photo);
    if (files.doc_pan) formData.append("doc_pan", files.doc_pan);
    if (files.doc_aadhaar) formData.append("doc_aadhaar", files.doc_aadhaar);

    // Multiple file uploads
    multiFiles.doc_payslips.forEach((f) => formData.append("doc_payslips", f));
    multiFiles.doc_exp_cert.forEach((f) => formData.append("doc_exp_cert", f));
    multiFiles.doc_last_company.forEach((f) => formData.append("doc_last_company", f));
    multiFiles.uploaded_documents.forEach((f) => formData.append("uploaded_documents", f));

    // Remaining existing files JSON
    if (multiFiles.doc_payslips.length === 0) {
      formData.append("doc_payslips", JSON.stringify(existingPayslips));
    }
    if (multiFiles.doc_exp_cert.length === 0) {
      formData.append("doc_exp_cert", JSON.stringify(existingExpCerts));
    }
    if (multiFiles.doc_last_company.length === 0) {
      formData.append("doc_last_company", JSON.stringify(existingLastCompanyDocs));
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/employee/${activeEmpId}/profile`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (data.profile_photo) {
          localStorage.setItem("profile_photo", data.profile_photo);
          setEmpData((prev) => ({ ...prev, profile_photo: data.profile_photo }));
        }
        try {
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          if (data.profile_photo) storedUser.profile_photo = data.profile_photo;
          localStorage.setItem("user", JSON.stringify(storedUser));
        } catch (_) {}

        // Notify Navbar and other listening components
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("profileUpdated", { detail: { profile_photo: data.profile_photo } }));

        toast.success("Profile updated successfully!");
        setTimeout(() => {
          navigate("/employee/dashboard");
        }, 1200);
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="text-muted mt-2">Loading profile details...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ maxWidth: "980px" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-primary mb-1">Employee Profile & Records</h2>
          <p className="text-muted mb-0">Manage complete personal details, work experience, qualifications, and verification documents.</p>
        </div>
        <Button variant="outline-secondary" onClick={() => navigate("/employee/dashboard")} className="rounded-pill px-4 shadow-sm">
          Dashboard
        </Button>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Profile Photo Card */}
        <Card className="p-4 shadow-sm border-0 mb-4 rounded-4" style={{ background: "linear-gradient(135deg, #f8f9fa, #eef1f6)" }}>
          <Row className="align-items-center">
            <Col md={3} className="text-center mb-3 mb-md-0">
              <img
                src={
                  files.profile_photo
                    ? URL.createObjectURL(files.profile_photo)
                    : empData?.profile_photo
                    ? getUploadUrl(empData.profile_photo)
                    : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
                alt="profile"
                className="rounded-circle border border-4 border-white shadow-sm"
                style={{ width: "128px", height: "128px", objectFit: "cover" }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                }}
              />
            </Col>
            <Col md={9}>
              <h5 className="fw-bold text-dark mb-1">Upload Profile Picture</h5>
              <p className="text-muted small mb-3">Upload a clean, professional passport-sized photograph (PNG, JPG).</p>
              <Form.Group>
                <Form.Control
                  type="file"
                  name="profile_photo"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ maxWidth: "340px" }}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card>

        {/* Section 1: Personal Details */}
        <Card className="p-4 shadow-sm border-0 mb-4 rounded-4">
          <Card.Title className="fw-bold text-primary border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
            <FaClipboardList className="text-primary" /> Personal Details
          </Card.Title>
          <Row className="g-3">
            {/* Employee Name (Set by HR - Read Only) */}
            <Col md={3}>
              <Form.Label className="small fw-bold text-muted">Full Name</Form.Label>
              <Form.Control
                type="text"
                value={empData?.name || empData?.employee_name || "Employee"}
                disabled
                readOnly
                className="bg-light fw-bold text-dark border-secondary-subtle"
                style={{ cursor: "not-allowed" }}
              />
            </Col>

            {/* Department (Read Only) */}
            <Col md={3}>
              <Form.Label className="small fw-bold text-muted">Department</Form.Label>
              <Form.Control
                type="text"
                value={empData?.dept || empData?.department || "General"}
                disabled
                readOnly
                className="bg-light fw-bold text-dark border-secondary-subtle"
                style={{ cursor: "not-allowed" }}
              />
            </Col>

            {/* Designation (Read Only) */}
            <Col md={3}>
              <Form.Label className="small fw-bold text-muted">Designation / Role</Form.Label>
              <Form.Control
                type="text"
                value={empData?.designation || empData?.job_role || "Team Member"}
                disabled
                readOnly
                className="bg-light fw-bold text-dark border-secondary-subtle"
                style={{ cursor: "not-allowed" }}
              />
            </Col>

            {/* Employment Status */}
            <Col md={3}>
              <Form.Label className="small fw-bold text-muted">Employment Status</Form.Label>
              <div className="pt-1">
                <Badge
                  bg={
                    empData?.status === "Active"
                      ? "success"
                      : empData?.status === "Resigned"
                      ? "warning"
                      : "secondary"
                  }
                  text={empData?.status === "Resigned" ? "dark" : "white"}
                  className="px-3 py-2 fs-6 rounded-pill d-inline-flex align-items-center gap-1 shadow-xs"
                >
                  {empData?.status === "Active"
                    ? "● Active"
                    : empData?.status === "Resigned"
                    ? "● Resigned"
                    : `● ${empData?.status || "Inactive"}`}
                </Badge>
              </div>
            </Col>

            {/* Work Email (Official - Set by HR) */}
            <Col md={6}>
              <Form.Label className="small fw-bold text-muted d-flex align-items-center gap-1">
                Work Email
                <Badge bg="primary" style={{ fontSize: "10px", fontWeight: "normal" }}>Official / Login</Badge>
              </Form.Label>
              <Form.Control
                type="email"
                value={empData?.work_email || empData?.email || "—"}
                disabled
                readOnly
                className="bg-light fw-semibold text-dark border-secondary-subtle"
                style={{ cursor: "not-allowed" }}
              />
              <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
                Primary official email registered by HR
              </Form.Text>
            </Col>

            {/* Personal Email */}
            <Col md={6}>
              <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                Personal Email
                <Badge bg="secondary" style={{ fontSize: "10px", fontWeight: "normal" }}>Personal Contact</Badge>
              </Form.Label>
              <Form.Control
                type="email"
                name="personal_email"
                placeholder="e.g. personal.name@gmail.com"
                value={personal.personal_email || ""}
                onChange={handlePersonalChange}
              />
              <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
                Used for personal correspondence and records
              </Form.Text>
            </Col>

            <Col md={6}>
              <Form.Label className="small fw-bold">Date of Birth</Form.Label>
              <Form.Control
                type="date"
                name="dob"
                value={personal.dob}
                onChange={handlePersonalChange}
                required
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Gender</Form.Label>
              <Form.Select name="gender" value={personal.gender} onChange={handlePersonalChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Nationality</Form.Label>
              <Form.Control
                type="text"
                name="nationality"
                placeholder="e.g. Indian"
                value={personal.nationality}
                onChange={handlePersonalChange}
                required
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Blood Group</Form.Label>
              <Form.Select name="blood_group" value={personal.blood_group} onChange={handlePersonalChange} required>
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Religion</Form.Label>
              <Form.Control
                type="text"
                name="religion"
                placeholder="e.g. Hinduism, Islam, Christianity, Sikhism"
                value={personal.religion}
                onChange={handlePersonalChange}
                required
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Marital Status</Form.Label>
              <Form.Select name="marital_status" value={personal.marital_status} onChange={handlePersonalChange} required>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Emergency Contact Name</Form.Label>
              <Form.Control
                type="text"
                name="emergency_contact_name"
                placeholder="Name of contact person"
                value={personal.emergency_contact_name}
                onChange={handlePersonalChange}
                required
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Emergency Contact Phone</Form.Label>
              <Form.Control
                type="number"
                name="emergency_contact_phone"
                placeholder="10 digit phone number"
                value={personal.emergency_contact_phone}
                onChange={handlePersonalChange}
                required
              />
            </Col>
            <Col md={12}>
              <Form.Label className="small fw-bold">Current Address</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="address_current"
                placeholder="Detailed current living address"
                value={personal.address_current}
                onChange={handlePersonalChange}
                required
              />
            </Col>
            <Col md={12}>
              <Form.Label className="small fw-bold">Permanent Address</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="address_permanent"
                placeholder="Detailed permanent address"
                value={personal.address_permanent}
                onChange={handlePersonalChange}
                required
              />
            </Col>
          </Row>
        </Card>

        {/* Section 2: Work Experience (Dedicated Section) */}
        <Card className="p-4 shadow-sm border-0 mb-4 rounded-4" style={{ borderLeft: "5px solid #0d6efd" }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-2 mb-3 gap-2">
            <div>
              <Card.Title className="fw-bold text-primary mb-1 d-flex align-items-center gap-2">
                <FaBriefcase className="text-primary" /> Work Experience
              </Card.Title>
              <span className="text-muted small">
                Track previous career background and monitor organization tenure.
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-semibold">Total Career Experience:</span>
              <Badge bg="primary" className="px-3 py-2 fs-6 rounded-pill shadow-xs">
                ✨ {totalExperience}
              </Badge>
            </div>
          </div>

          {/* Previous Work Experience Sub-section */}
          <div className="p-3 mb-4 rounded-4 border bg-white shadow-xs">
            <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-2 mb-3 gap-2">
              <div>
                <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <FaHistory className="text-secondary" /> Previous Work Experience
                </h6>
                <small className="text-muted">
                  Add previous companies, designations, service duration, and reporting manager details.
                </small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Badge bg="info-subtle" className="text-info-emphasis border border-info-subtle px-2.5 py-1.5 fw-semibold">
                  Recognized Previous Tenure: {computedPreviousExperienceText}
                </Badge>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleAddPreviousExp}
                  className="rounded-pill px-3 py-1 shadow-xs fw-semibold"
                >
                  <FaPlus className="me-1" size={11} /> Add Previous Company
                </Button>
              </div>
            </div>

            {previousExperienceList.length === 0 ? (
              <div className="text-center py-4 bg-light rounded-3 border border-dashed">
                <div className="text-muted mb-2 fs-4">🏢</div>
                <div className="fw-semibold text-secondary small">No previous company records added</div>
                <p className="text-muted small mb-3" style={{ maxWidth: "480px", margin: "0 auto" }}>
                  Record your prior employers, designation, joining & resign dates, and reporting manager designations.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddPreviousExp}
                  className="rounded-pill px-3 shadow-xs"
                >
                  <FaPlus className="me-1" size={11} /> Add First Previous Company
                </Button>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {previousExperienceList.map((exp, idx) => (
                  <div key={idx} className="p-3 rounded-3 border bg-light-subtle position-relative">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="badge bg-secondary-subtle text-secondary-emphasis border px-2 py-1 small fw-bold">
                        Previous Company #{idx + 1}
                      </span>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemovePreviousExp(idx)}
                        className="py-0 px-2 text-xs"
                      >
                        <FaTrash className="me-1" size={11} /> Remove
                      </Button>
                    </div>
                    <Row className="g-2">
                      <Col md={6}>
                        <Form.Label className="small fw-semibold mb-1">Company Name</Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="e.g. Infosys, TCS, Wipro"
                          value={exp.company_name || ""}
                          onChange={(e) => handlePreviousExpChange(idx, "company_name", e.target.value)}
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Label className="small fw-semibold mb-1">Employee Designation</Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="e.g. Software Engineer / Analyst"
                          value={exp.designation || ""}
                          onChange={(e) => handlePreviousExpChange(idx, "designation", e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Label className="small fw-semibold mb-1">Joining Date</Form.Label>
                        <Form.Control
                          size="sm"
                          type="date"
                          value={exp.joining_date || ""}
                          onChange={(e) => handlePreviousExpChange(idx, "joining_date", e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Label className="small fw-semibold mb-1">Resign Date</Form.Label>
                        <Form.Control
                          size="sm"
                          type="date"
                          value={exp.resign_date || ""}
                          onChange={(e) => handlePreviousExpChange(idx, "resign_date", e.target.value)}
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Label className="small fw-semibold mb-1 d-flex justify-content-between">
                          <span>Total Experience</span>
                          <span className="text-muted" style={{ fontSize: "10.5px" }}>Auto-calculated upon dates</span>
                        </Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Auto-calculated (e.g. 1 Year 6 Months)"
                          value={exp.total_experience || ""}
                          onChange={(e) => handlePreviousExpChange(idx, "total_experience", e.target.value)}
                          className="bg-white fw-semibold text-primary"
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Label className="small fw-semibold mb-1">Reporting Manager</Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Manager Name"
                          value={exp.reporting_manager || ""}
                          onChange={(e) => handlePreviousExpChange(idx, "reporting_manager", e.target.value)}
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Label className="small fw-semibold mb-1">Reporting Manager Designation</Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="e.g. Engineering Director / VP"
                          value={exp.reporting_manager_designation || ""}
                          onChange={(e) => handlePreviousExpChange(idx, "reporting_manager_designation", e.target.value)}
                        />
                      </Col>
                    </Row>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Row className="g-4">
            {/* Current Experience Box */}
            <Col lg={12}>
              <div
                className="p-3 rounded-4 border h-100 shadow-xs d-flex flex-column justify-content-between"
                style={{
                  background: isResigned
                    ? "linear-gradient(135deg, #fff5f5, #ffe8e8)"
                    : "linear-gradient(135deg, #f0f7ff, #e8f0fe)",
                  borderColor: isResigned ? "#fecaca" : "#bfdbfe"
                }}
              >
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                      <FaBuilding className={isResigned ? "text-danger" : "text-primary"} /> Current Company Tenure
                    </h6>
                    {isResigned ? (
                      <Badge bg="danger" className="px-2 py-1">
                        🔴 Resigned / Relieved
                      </Badge>
                    ) : (
                      <Badge bg="success" className="px-2 py-1">
                        🟢 Active Service
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted small mb-2">
                    Auto-calculated in real time from official Date of Joining until {isResigned ? "resignation / relieving date" : "present day"}.
                  </p>

                  <div className="my-3 text-center p-3 bg-white rounded-3 border border-secondary-subtle shadow-xs">
                    <div className="text-muted small text-uppercase fw-bold letter-spacing-1 mb-1">
                      {isResigned ? "Total Served Tenure" : "Current Experience"}
                    </div>
                    <div
                      className={`fw-bold ${isResigned ? "text-danger" : "text-primary"}`}
                      style={{ fontSize: "1.45rem", lineHeight: "1.3" }}
                    >
                      {currentExperience.formatted}
                    </div>
                    <div className="small text-muted mt-1">
                      {currentExperience.status === "active" && (
                        <span>✨ Continuously growing live tenure</span>
                      )}
                      {currentExperience.status === "resigned" && (
                        <span>🏁 Service completed up to exit date</span>
                      )}
                      {currentExperience.status === "missing" && (
                        <span className="text-warning">⚠️ Please ask HR to set your Date of Joining</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-top d-flex flex-wrap justify-content-between gap-1 small text-muted">
                  <div>
                    <FaCalendarAlt className="me-1 text-secondary" />
                    <strong>Joined:</strong> {formatDate(empData?.joining_date)}
                  </div>
                  <div>
                    <FaClock className="me-1 text-secondary" />
                    <strong>{isResigned ? "Relieved / Exit:" : "Counted To:"}</strong>{" "}
                    {isResigned ? formatDate(exitDate) : "Today (Present)"}
                  </div>
                </div>
              </div>
            </Col>

            {/* Bottom Breakdown Bar: Summary */}
            <Col xs={12}>
              <div className="p-3 bg-light rounded-4 border d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="p-2 bg-white rounded-circle shadow-xs text-primary">
                    <FaCalculator size={18} />
                  </div>
                  <div>
                    <div className="fw-bold text-dark small">Cumulative Career Summary</div>
                    <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                      Combined summation of previous work history and current organization tenure
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span className="badge bg-white text-dark border px-3 py-2">
                    <span className="text-muted small me-1">Previous:</span>
                    <strong>{computedPreviousExperienceText || "0 Yrs"}</strong>
                  </span>
                  <span className="fw-bold text-muted">+</span>
                  <span className="badge bg-white text-dark border px-3 py-2">
                    <span className="text-muted small me-1">Current:</span>
                    <strong>{currentExperience.shortFormatted || "0m"}</strong>
                  </span>
                  <span className="fw-bold text-muted">=</span>
                  <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle px-3 py-2 fw-bold">
                    Total: {totalExperience}
                  </span>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Section 3: Educational Qualifications */}
        <Card className="p-4 shadow-sm border-0 mb-4 rounded-4">
          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
            <Card.Title className="fw-bold text-primary mb-0 d-flex align-items-center gap-2">
              <FaGraduationCap className="text-primary" /> Educational Qualifications
            </Card.Title>
            <Button variant="primary" size="sm" onClick={handleAddEducation} className="rounded-pill px-3 shadow-xs">
              + Add Qualification
            </Button>
          </div>

          {educationList.length === 0 ? (
            <p className="text-muted text-center py-3">No educational qualifications added yet.</p>
          ) : (
            <Table responsive borderless className="align-middle">
              <thead>
                <tr className="border-bottom text-muted small">
                  <th>Degree / Course</th>
                  <th>College / University</th>
                  <th>Institution / Board</th>
                  <th>Joining Year</th>
                  <th>Passing Year</th>
                  <th>GPA / %</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {educationList.map((edu, idx) => (
                  <tr key={idx}>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. B.Tech / BSC"
                        value={edu.degree || ""}
                        onChange={(e) => handleEducationChange(idx, "degree", e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. Delhi University / IIT"
                        value={edu.college_university || ""}
                        onChange={(e) => handleEducationChange(idx, "college_university", e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. School / Board"
                        value={edu.institution || ""}
                        onChange={(e) => handleEducationChange(idx, "institution", e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="number"
                        placeholder="e.g. 2018"
                        value={edu.joining_year || ""}
                        onChange={(e) => handleEducationChange(idx, "joining_year", e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="number"
                        placeholder="e.g. 2022"
                        value={edu.year || ""}
                        onChange={(e) => handleEducationChange(idx, "year", e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. 8.5 or 85%"
                        value={edu.gpa || ""}
                        onChange={(e) => handleEducationChange(idx, "gpa", e.target.value)}
                        required
                      />
                    </td>
                    <td className="text-center">
                      <Button variant="outline-danger" size="sm" onClick={() => handleRemoveEducation(idx)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Section 4: Certifications & Professional Training */}
        <Card className="p-4 shadow-sm border-0 mb-4 rounded-4">
          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
            <Card.Title className="fw-bold text-primary mb-0 d-flex align-items-center gap-2">
              <FaCertificate className="text-primary" /> Certifications & Professional Training
            </Card.Title>
            <Button variant="outline-primary" size="sm" onClick={handleAddCertification} className="rounded-pill px-3 shadow-xs">
              + Add Certification
            </Button>
          </div>

          {certificationList.length === 0 ? (
            <p className="text-muted text-center py-2 small">No certifications added yet. Click above to add professional certificates.</p>
          ) : (
            <Table responsive borderless className="align-middle">
              <thead>
                <tr className="border-bottom text-muted small">
                  <th>Certification Title</th>
                  <th>Issuing Organization</th>
                  <th>Issue Date</th>
                  <th>Credential ID / URL</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {certificationList.map((cert, idx) => (
                  <tr key={idx}>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. AWS Certified Solutions Architect"
                        value={cert.title || ""}
                        onChange={(e) => handleCertificationChange(idx, "title", e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. Amazon Web Services"
                        value={cert.issuer || ""}
                        onChange={(e) => handleCertificationChange(idx, "issuer", e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="date"
                        value={cert.issue_date || ""}
                        onChange={(e) => handleCertificationChange(idx, "issue_date", e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. AWS-12345"
                        value={cert.credential_id || ""}
                        onChange={(e) => handleCertificationChange(idx, "credential_id", e.target.value)}
                      />
                    </td>
                    <td className="text-center">
                      <Button variant="outline-danger" size="sm" onClick={() => handleRemoveCertification(idx)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Section 5: Family Details */}
        <Card className="p-4 shadow-sm border-0 mb-4 rounded-4">
          <Card.Title className="fw-bold text-primary border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
            <FaUsers className="text-primary" /> Family Details
          </Card.Title>
          <Row className="g-3 mb-4">
            {/* Father Details */}
            <Col md={6}>
              <Form.Label className="small fw-bold">Father's Name</Form.Label>
              <Form.Control
                type="text"
                name="father_name"
                placeholder="Father's full name"
                value={family.father_name}
                onChange={handleFamilyChange}
                required
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Father's D.O.B</Form.Label>
              <Form.Control
                type="date"
                name="father_dob"
                value={family.father_dob || ""}
                onChange={handleFamilyChange}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold d-flex justify-content-between">
                <span>Father's Age</span>
                <span className="text-muted" style={{ fontSize: "10.5px" }}>Auto-calculated</span>
              </Form.Label>
              <Form.Control
                type="number"
                name="father_age"
                placeholder="Age in yrs"
                value={family.father_age || ""}
                onChange={handleFamilyChange}
                className="bg-light fw-semibold"
              />
            </Col>

            {/* Mother Details */}
            <Col md={6}>
              <Form.Label className="small fw-bold">Mother's Name</Form.Label>
              <Form.Control
                type="text"
                name="mother_name"
                placeholder="Mother's full name"
                value={family.mother_name}
                onChange={handleFamilyChange}
                required
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Mother's D.O.B</Form.Label>
              <Form.Control
                type="date"
                name="mother_dob"
                value={family.mother_dob || ""}
                onChange={handleFamilyChange}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold d-flex justify-content-between">
                <span>Mother's Age</span>
                <span className="text-muted" style={{ fontSize: "10.5px" }}>Auto-calculated</span>
              </Form.Label>
              <Form.Control
                type="number"
                name="mother_age"
                placeholder="Age in yrs"
                value={family.mother_age || ""}
                onChange={handleFamilyChange}
                className="bg-light fw-semibold"
              />
            </Col>

            {/* Spouse Details (Auto-calibrated based on Marital Status) */}
            <Col md={6}>
              <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                Spouse's Name
                {isSingle ? (
                  <Badge bg="secondary" style={{ fontSize: "10px" }}>🔒 Disabled (Single)</Badge>
                ) : (
                  <Badge bg="success-subtle" className="text-success border border-success-subtle" style={{ fontSize: "10px" }}>Enabled</Badge>
                )}
              </Form.Label>
              <Form.Control
                type="text"
                name="spouse_name"
                placeholder={isSingle ? "Disabled (Status: Single)" : "Spouse's full name"}
                value={isSingle ? "" : (family.spouse_name || "")}
                onChange={handleFamilyChange}
                disabled={isSingle}
                className={isSingle ? "bg-light text-muted" : ""}
              />
              {isSingle && (
                <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
                  Disabled because Marital Status is Single. Change Marital Status in Personal Details above to enable.
                </Form.Text>
              )}
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Spouse's D.O.B</Form.Label>
              <Form.Control
                type="date"
                name="spouse_dob"
                value={isSingle ? "" : (family.spouse_dob || "")}
                onChange={handleFamilyChange}
                disabled={isSingle}
                className={isSingle ? "bg-light text-muted" : ""}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Spouse's Age</Form.Label>
              <Form.Control
                type="number"
                name="spouse_age"
                placeholder="Age in yrs"
                value={isSingle ? "" : (family.spouse_age || "")}
                onChange={handleFamilyChange}
                disabled={isSingle}
                className="bg-light fw-semibold"
              />
            </Col>

            {/* Emergency Contact */}
            <Col md={12}>
              <Form.Label className="small fw-bold">Family Emergency Contact Phone</Form.Label>
              <Form.Control
                type="text"
                name="contact"
                placeholder="Primary family contact number"
                value={family.contact}
                onChange={handleFamilyChange}
                required
              />
            </Col>
          </Row>

          {/* Children Details */}
          <div className="pt-3 border-top">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-secondary mb-0">👶 Children Details (Optional)</h6>
              <Button variant="outline-secondary" size="sm" onClick={handleAddChild} className="rounded-pill px-3">
                + Add Child
              </Button>
            </div>

            {childrenList.length === 0 ? (
              <p className="text-muted small mb-0">No children details added.</p>
            ) : (
              <Table responsive borderless size="sm" className="align-middle">
                <thead>
                  <tr className="border-bottom text-muted small">
                    <th>Child's Full Name</th>
                    <th>Date of Birth</th>
                    <th>Gender</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {childrenList.map((child, idx) => (
                    <tr key={idx}>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Full Name"
                          value={child.name || ""}
                          onChange={(e) => handleChildChange(idx, "name", e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="date"
                          value={child.dob || ""}
                          onChange={(e) => handleChildChange(idx, "dob", e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={child.gender || "Male"}
                          onChange={(e) => handleChildChange(idx, "gender", e.target.value)}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </Form.Select>
                      </td>
                      <td className="text-center">
                        <Button variant="outline-danger" size="sm" onClick={() => handleRemoveChild(idx)}>
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Card>

        {/* Section 6: Passport, Visa & Driving License Details */}
        <Card className="p-4 shadow-sm border-0 mb-4 rounded-4">
          <Card.Title className="fw-bold text-primary border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
            <FaPassport className="text-primary" /> Passport, Visa & Driving License Details
          </Card.Title>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label className="small fw-bold">Passport Number</Form.Label>
              <Form.Control
                type="text"
                name="passport_no"
                placeholder="e.g. Z1234567"
                value={passportVisa.passport_no}
                onChange={handlePassportVisaChange}
              />
            </Col>
            <Col md={4}>
              <Form.Label className="small fw-bold">Passport Issue Date</Form.Label>
              <Form.Control
                type="date"
                name="passport_issue"
                value={passportVisa.passport_issue}
                onChange={handlePassportVisaChange}
              />
            </Col>
            <Col md={4}>
              <Form.Label className="small fw-bold">Passport Expiry Date</Form.Label>
              <Form.Control
                type="date"
                name="passport_expiry"
                value={passportVisa.passport_expiry}
                onChange={handlePassportVisaChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Visa Type</Form.Label>
              <Form.Select
                name="visa_type"
                value={passportVisa.visa_type}
                onChange={handlePassportVisaChange}
              >
                <option value="N/A">Not Applicable (N/A)</option>
                <option value="Work Permit">Work Permit</option>
                <option value="Business Visa">Business Visa</option>
                <option value="Permanent Resident">Permanent Resident</option>
                <option value="Student Visa">Student Visa</option>
                <option value="Tourist Visa">Tourist Visa</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Visa Expiry Date</Form.Label>
              <Form.Control
                type="date"
                name="visa_expiry"
                value={passportVisa.visa_expiry}
                onChange={handlePassportVisaChange}
              />
            </Col>

            {/* Driving License Field */}
            <Col md={6}>
              <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                Driving License Number
                <Badge bg="light" text="dark" className="border" style={{ fontSize: "10px" }}>DL Proof</Badge>
              </Form.Label>
              <Form.Control
                type="text"
                name="driving_license"
                placeholder="e.g. DL-0420110123456"
                value={passportVisa.driving_license || ""}
                onChange={handlePassportVisaChange}
              />
              <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
                Valid Government issued motor driving license
              </Form.Text>
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Driving License Expiry Date</Form.Label>
              <Form.Control
                type="date"
                name="driving_license_expiry"
                value={passportVisa.driving_license_expiry || ""}
                onChange={handlePassportVisaChange}
              />
            </Col>
          </Row>
        </Card>

        {/* Section 7: Bank & Financial Details */}
        <Card className="p-4 shadow-sm border-0 mb-4 rounded-4">
          <Card.Title className="fw-bold text-primary border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
            <FaUniversity className="text-primary" /> Bank & Financial Details
          </Card.Title>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label className="small fw-bold">Bank Name</Form.Label>
              <Form.Control
                type="text"
                name="bank_name"
                placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                value={bankDetails.bank_name}
                onChange={handleBankDetailsChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Account Holder Name</Form.Label>
              <Form.Control
                type="text"
                name="account_holder"
                placeholder="As per bank passbook"
                value={bankDetails.account_holder}
                onChange={handleBankDetailsChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Account Number</Form.Label>
              <Form.Control
                type="text"
                name="account_no"
                placeholder="e.g. 50100234567890"
                value={bankDetails.account_no}
                onChange={handleBankDetailsChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">PAN Card Number</Form.Label>
              <Form.Control
                type="text"
                name="pan_number"
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                value={bankDetails.pan_number}
                onChange={handleBankDetailsChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">IFSC / SWIFT Code</Form.Label>
              <Form.Control
                type="text"
                name="ifsc_code"
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                value={bankDetails.ifsc_code}
                onChange={handleBankDetailsChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">Branch Name</Form.Label>
              <Form.Control
                type="text"
                name="branch_name"
                placeholder="Branch Location"
                value={bankDetails.branch_name}
                onChange={handleBankDetailsChange}
              />
            </Col>
          </Row>
        </Card>

        {/* Section 8: Verification Documents Upload */}
        <Card className="p-4 shadow-sm border-0 mb-4 rounded-4">
          <Card.Title className="fw-bold text-primary border-bottom pb-2 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span className="d-flex align-items-center gap-2">
              <FaFolderOpen className="text-primary" /> Verification Documents Upload
            </span>
            {empData && (
              <div className="d-flex align-items-center gap-2 fs-6">
                <span className="small text-muted fw-normal">Verification Status:</span>
                {(() => {
                  switch (empData.document_status) {
                    case "Verified":
                      return <Badge bg="success">Verified ✅</Badge>;
                    case "Pending Verification":
                      return <Badge bg="warning" text="dark">Pending HR Verification ⏳</Badge>;
                    case "Pending Upload":
                      return <Badge bg="danger">Pending Upload ⚠️</Badge>;
                    case "Rejected":
                      return <Badge bg="danger">Rejected ❌</Badge>;
                    default:
                      return <Badge bg="secondary">Not Uploaded 📄</Badge>;
                  }
                })()}
              </div>
            )}
          </Card.Title>

          {/* HR Request Banner */}
          {empData?.document_status === "Pending Upload" && (
            <div className="alert alert-warning border-warning d-flex align-items-center gap-3 p-3 rounded-4 mb-4 shadow-xs">
              <div className="fs-3">⚠️</div>
              <div>
                <strong className="d-block text-dark">Action Required: Verification Documents Requested by HR</strong>
                <span className="small text-muted">
                  HR has requested you to upload your PAN, Aadhaar, previous work experience documents, last 3 months salary slips, and educational certificates below. Once uploaded and submitted, your documents will be submitted to HR for approval.
                </span>
              </div>
            </div>
          )}

          <Row className="g-4">
            {/* Last Company Details & Documents */}
            <Col md={12}>
              <div className="p-3 border rounded-3 shadow-xs bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Form.Label className="small fw-bold mb-0 text-dark d-flex align-items-center gap-1">
                    🏢 Last Company Details & Separation Documents
                    <Badge bg="primary" style={{ fontSize: "10px" }}>Previous Employer</Badge>
                  </Form.Label>
                  <Badge bg="light" text="dark" className="border small">
                    Multiple Uploads Allowed
                  </Badge>
                </div>

                <Form.Group className="mb-2">
                  <Form.Label className="small text-muted mb-1">Last Company Summary / Details</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Enter previous employer name, designation held, last working date, HR contact or relieving remarks"
                    value={lastCompanyDetails}
                    onChange={(e) => setLastCompanyDetails(e.target.value)}
                    className="mb-2"
                  />
                </Form.Group>

                <Form.Label className="small text-muted mb-1">
                  Upload Relieving Letter, Service Certificate, or Exit Documents (PDF, Images, Docs)
                </Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={(e) => handleMultiFileChange("doc_last_company", e)}
                  className="mb-2"
                />

                {/* Newly selected files */}
                {multiFiles.doc_last_company.length > 0 && (
                  <div className="mb-2 p-2 bg-white rounded border">
                    <small className="fw-bold text-primary d-block mb-1">Newly Selected Files ({multiFiles.doc_last_company.length}):</small>
                    <div className="d-flex flex-wrap gap-1">
                      {multiFiles.doc_last_company.map((f, idx) => (
                        <Badge key={idx} bg="light" text="dark" className="border d-flex align-items-center gap-1 p-1 px-2">
                          <span className="text-truncate" style={{ maxWidth: "160px" }}>{f.name}</span>
                          <span className="text-muted" style={{ fontSize: "9px" }}>({Math.round(f.size / 1024)} KB)</span>
                          <span
                            onClick={() => handleRemoveMultiFile("doc_last_company", idx)}
                            style={{ cursor: "pointer", color: "red", fontWeight: "bold" }}
                          >
                            &times;
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing uploaded files */}
                {existingLastCompanyDocs.length > 0 && (
                  <div>
                    <small className="fw-semibold text-muted d-block mb-1">Currently Uploaded Documents:</small>
                    <div className="d-flex flex-wrap gap-2">
                      {existingLastCompanyDocs.map((doc, idx) => {
                        const filename = doc.filename || doc;
                        const originalname = doc.originalname || `Last Company Doc #${idx + 1}`;
                        return (
                          <div key={idx} className="btn-group btn-group-sm">
                            <a
                              href={`${UPLOADS_BASE}/${filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-secondary py-1 px-2 fw-semibold"
                              style={{ fontSize: "11px" }}
                            >
                              🏢 {originalname} <FaExternalLinkAlt size={10} className="ms-1" />
                            </a>
                            <button
                              type="button"
                              className="btn btn-outline-danger py-1 px-2"
                              title="Delete file"
                              onClick={() => handleRemoveExistingDoc("last_company", idx)}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Col>

            {/* Last 3 Months Salary Slips */}
            <Col md={6}>
              <div className="p-3 border rounded-3 shadow-xs bg-light h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="small fw-bold text-dark mb-0 d-flex align-items-center gap-1">
                      💵 Last 3 Months Salary Slips
                    </Form.Label>
                    <Badge bg="success-subtle" className="text-success border border-success-subtle" style={{ fontSize: "10px" }}>
                      Multiple Files
                    </Badge>
                  </div>
                  <small className="text-muted d-block mb-2">
                    Upload consecutive payslips from your most recent employer (PDF or images).
                  </small>
                  <Form.Control
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={(e) => handleMultiFileChange("doc_payslips", e)}
                    className="mb-2"
                  />

                  {/* Newly selected payslips */}
                  {multiFiles.doc_payslips.length > 0 && (
                    <div className="mb-2 p-2 bg-white rounded border">
                      <small className="fw-bold text-success d-block mb-1">Selected Slips ({multiFiles.doc_payslips.length}):</small>
                      <div className="d-flex flex-wrap gap-1">
                        {multiFiles.doc_payslips.map((f, idx) => (
                          <Badge key={idx} bg="light" text="dark" className="border d-flex align-items-center gap-1 p-1 px-2">
                            <span className="text-truncate" style={{ maxWidth: "140px" }}>{f.name}</span>
                            <span className="text-muted" style={{ fontSize: "9px" }}>({Math.round(f.size / 1024)} KB)</span>
                            <span
                              onClick={() => handleRemoveMultiFile("doc_payslips", idx)}
                              style={{ cursor: "pointer", color: "red", fontWeight: "bold" }}
                            >
                              &times;
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Existing salary slips */}
                  {existingPayslips.length > 0 && (
                    <div>
                      <small className="fw-semibold text-muted d-block mb-1">Existing Salary Slips ({existingPayslips.length}):</small>
                      <div className="d-flex flex-wrap gap-1">
                        {existingPayslips.map((s, idx) => {
                          const filename = s.filename || s;
                          const name = s.originalname || `Salary Slip #${idx + 1}`;
                          return (
                            <div key={idx} className="btn-group btn-group-sm mb-1">
                              <a
                                href={`${UPLOADS_BASE}/${filename}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-success py-1 px-2 fw-semibold"
                                style={{ fontSize: "11px" }}
                              >
                                💵 {name} <FaExternalLinkAlt size={9} className="ms-1" />
                              </a>
                              <button
                                type="button"
                                className="btn btn-outline-danger py-1 px-2"
                                onClick={() => handleRemoveExistingDoc("payslips", idx)}
                              >
                                &times;
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Col>

            {/* Experience Certificate */}
            <Col md={6}>
              <div className="p-3 border rounded-3 shadow-xs bg-light h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="small fw-bold text-dark mb-0 d-flex align-items-center gap-1">
                      📜 Experience Certificate(s)
                    </Form.Label>
                    <Badge bg="info-subtle" className="text-info border border-info-subtle" style={{ fontSize: "10px" }}>
                      Multiple Files
                    </Badge>
                  </div>
                  <small className="text-muted d-block mb-2">
                    Upload official experience letters, service letters, or certificates from prior companies.
                  </small>
                  <Form.Control
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={(e) => handleMultiFileChange("doc_exp_cert", e)}
                    className="mb-2"
                  />

                  {/* Newly selected experience certs */}
                  {multiFiles.doc_exp_cert.length > 0 && (
                    <div className="mb-2 p-2 bg-white rounded border">
                      <small className="fw-bold text-info d-block mb-1">Selected Certificates ({multiFiles.doc_exp_cert.length}):</small>
                      <div className="d-flex flex-wrap gap-1">
                        {multiFiles.doc_exp_cert.map((f, idx) => (
                          <Badge key={idx} bg="light" text="dark" className="border d-flex align-items-center gap-1 p-1 px-2">
                            <span className="text-truncate" style={{ maxWidth: "140px" }}>{f.name}</span>
                            <span className="text-muted" style={{ fontSize: "9px" }}>({Math.round(f.size / 1024)} KB)</span>
                            <span
                              onClick={() => handleRemoveMultiFile("doc_exp_cert", idx)}
                              style={{ cursor: "pointer", color: "red", fontWeight: "bold" }}
                            >
                              &times;
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Existing experience certs */}
                  {existingExpCerts.length > 0 && (
                    <div>
                      <small className="fw-semibold text-muted d-block mb-1">Existing Certificates ({existingExpCerts.length}):</small>
                      <div className="d-flex flex-wrap gap-1">
                        {existingExpCerts.map((c, idx) => {
                          const filename = c.filename || c;
                          const name = c.originalname || `Exp. Cert #${idx + 1}`;
                          return (
                            <div key={idx} className="btn-group btn-group-sm mb-1">
                              <a
                                href={`${UPLOADS_BASE}/${filename}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-info py-1 px-2 fw-semibold"
                                style={{ fontSize: "11px" }}
                              >
                                📜 {name} <FaExternalLinkAlt size={9} className="ms-1" />
                              </a>
                              <button
                                type="button"
                                className="btn btn-outline-danger py-1 px-2"
                                onClick={() => handleRemoveExistingDoc("exp_certs", idx)}
                              >
                                &times;
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Col>

            {/* PAN Card Upload */}
            <Col md={6}>
              <div className="p-3 border rounded-3 shadow-xs bg-light">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <Form.Label className="small fw-bold d-block text-dark mb-0">
                    💳 PAN Card Proof (PDF / Image)
                  </Form.Label>
                  {(empData?.pan_no || bankDetails.pan_number) && (
                    <Badge bg="light" text="dark" className="border" style={{ fontSize: "10px" }}>
                      PAN: {empData?.pan_no || bankDetails.pan_number}
                    </Badge>
                  )}
                </div>
                <Form.Control
                  type="file"
                  name="doc_pan"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="mb-2"
                />
                {empData?.doc_pan && (
                  <Badge bg="success" className="p-2 text-decoration-none d-inline-block mt-1">
                    <a
                      href={`${UPLOADS_BASE}/${empData.doc_pan}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-decoration-none"
                    >
                      💳 Download/View PAN Card Proof <FaExternalLinkAlt size={10} className="ms-1" />
                    </a>
                  </Badge>
                )}
              </div>
            </Col>

            {/* Aadhaar Card Upload */}
            <Col md={6}>
              <div className="p-3 border rounded-3 shadow-xs bg-light">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <Form.Label className="small fw-bold d-block text-dark mb-0">
                    🪪 Aadhaar Card Proof (PDF / Image)
                  </Form.Label>
                  {empData?.aadhaar_no && (
                    <Badge bg="light" text="dark" className="border" style={{ fontSize: "10px" }}>
                      Aadhaar: {empData.aadhaar_no}
                    </Badge>
                  )}
                </div>
                <Form.Control
                  type="file"
                  name="doc_aadhaar"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="mb-2"
                />
                {empData?.doc_aadhaar && (
                  <Badge bg="success" className="p-2 text-decoration-none d-inline-block mt-1">
                    <a
                      href={`${UPLOADS_BASE}/${empData.doc_aadhaar}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-decoration-none"
                    >
                      🪪 Download/View Aadhaar Card Proof <FaExternalLinkAlt size={10} className="ms-1" />
                    </a>
                  </Badge>
                )}
              </div>
            </Col>

            {/* CV / Resume */}
            <Col md={6}>
              <div className="p-3 border rounded-3 shadow-xs bg-light">
                <Form.Label className="small fw-bold d-block text-dark">
                  📄 CV / Resume (PDF / Doc)
                </Form.Label>
                <Form.Control
                  type="file"
                  name="doc_resume"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="mb-2"
                />
                {empData?.doc_resume && (
                  <Badge bg="success" className="p-2 text-decoration-none d-inline-block mt-1">
                    <a
                      href={`${UPLOADS_BASE}/${empData.doc_resume}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-decoration-none"
                    >
                      📄 Download/View Current CV <FaExternalLinkAlt size={10} className="ms-1" />
                    </a>
                  </Badge>
                )}
              </div>
            </Col>

            {/* National ID / Passport */}
            <Col md={6}>
              <div className="p-3 border rounded-3 shadow-xs bg-light">
                <Form.Label className="small fw-bold d-block text-dark">
                  🛂 National ID Card / Passport (PDF / Image)
                </Form.Label>
                <Form.Control
                  type="file"
                  name="doc_id"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="mb-2"
                />
                {empData?.doc_id && (
                  <Badge bg="success" className="p-2 text-decoration-none d-inline-block mt-1">
                    <a
                      href={`${UPLOADS_BASE}/${empData.doc_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-decoration-none"
                    >
                      🛂 Download/View Current ID <FaExternalLinkAlt size={10} className="ms-1" />
                    </a>
                  </Badge>
                )}
              </div>
            </Col>

            {/* Educational Certificates */}
            <Col md={12}>
              <div className="p-3 border rounded-3 shadow-xs bg-light">
                <Form.Label className="small fw-bold d-block text-dark">
                  🎓 All Educational Certificates (ZIP / PDF)
                </Form.Label>
                <Form.Control
                  type="file"
                  name="doc_cert"
                  accept=".pdf,.zip,.rar"
                  onChange={handleFileChange}
                  className="mb-2"
                />
                {empData?.doc_cert && (
                  <Badge bg="success" className="p-2 text-decoration-none d-inline-block mt-1">
                    <a
                      href={`${UPLOADS_BASE}/${empData.doc_cert}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-decoration-none"
                    >
                      🎓 Download/View Certificates <FaExternalLinkAlt size={10} className="ms-1" />
                    </a>
                  </Badge>
                )}
              </div>
            </Col>
          </Row>
        </Card>

        {/* Action Button */}
        <div className="text-end mb-5">
          <Button variant="success" size="lg" type="submit" disabled={saving} className="px-5 fw-bold rounded-pill shadow">
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving Profile...
              </>
            ) : (
              "Save & Submit Profile"
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
}
