import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Badge,
  Spinner,
  Alert,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  LuBadgeCheck,
  LuUpload,
  LuDownload,
  LuFileText,
  LuUser,
  LuPalette,
  LuCheck,
  LuSparkles,
  LuCreditCard,
  LuImage,
  LuGlobe,
} from "react-icons/lu";
import api, { getUploadUrl } from "../../api";
import logo from "../../assets/zentelex-logo.png";

const LANYARD_COLORS = [
  { id: "green", name: "Mint Emerald", hex: "#10b981", text: "text-emerald-500" },
  { id: "blue", name: "Royal Blue", hex: "#2563eb", text: "text-blue-600" },
  { id: "dark", name: "Carbon Slate", hex: "#1e293b", text: "text-slate-800" },
  { id: "crimson", name: "Ruby Crimson", hex: "#e11d48", text: "text-rose-600" },
  { id: "purple", name: "Deep Purple", hex: "#7c3aed", text: "text-purple-600" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

export default function ID_Card() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentEmpCode = localStorage.getItem("empId") || "EMP-RM-66";

  // Form State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // ID Card Data
  const [formData, setFormData] = useState({
    name: "Employee Name",
    employee_code: currentEmpCode || "ZEN0000X",
    designation: "DESIGNATION",
    dept: "DEPARTMENT",
    email: "abc@xyz.com",
    phone_no: "+91 98765 43210",
    dob: "1999-07-05",
    blood_group: "B+",
    emergency_contact_name: "Emergency Contact Name",
    emergency_contact_phone: "+91 6289672904",
    emergency_contact_phone2: "+91 XXXXXXXXXX",
    emergency_relation: "Spouse",
    joining_date: "2023-06-14",
    expiry_date: "2028-06-14",
    doc_id_type: "Aadhaar Card",
    doc_id_number: "XXXX-XXXX-8912",
    document_status: "Not Uploaded",
  });

  // Photo & Files
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [selectedDocFile, setSelectedDocFile] = useState(null);

  // Customization & View Controls
  const [lanyardColor, setLanyardColor] = useState(LANYARD_COLORS[0].hex);
  const [viewMode, setViewMode] = useState("both"); // "both" | "front" | "back"
  const [showLanyard, setShowLanyard] = useState(true);

  // Generated QR Code Data URL for Back Card
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Refs for PDF/Image Export
  const frontCardRef = useRef(null);
  const backCardRef = useRef(null);

  // 1. Fetch Existing Employee Details
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/employee/${currentEmpCode}`);
        if (res.data.success && res.data.data) {
          const emp = res.data.data;
          const joinDate = emp.joining_date || "2023-06-14";
          let expDate = "2028-06-14";
          try {
            const jYear = new Date(joinDate).getFullYear();
            expDate = `${jYear + 5}-01-01`;
          } catch (e) { }

          setFormData((prev) => ({
            ...prev,
            name: emp.name || prev.name,
            employee_code: emp.employee_code || currentEmpCode,
            designation: emp.designation || prev.designation || "Associate Software Engineer",
            dept: emp.dept || prev.dept,
            email: emp.email || prev.email,
            phone_no: emp.phone_no || prev.phone_no,
            dob: emp.dob || prev.dob,
            blood_group: emp.blood_group || prev.blood_group,
            emergency_contact_name: emp.emergency_contact_name || prev.emergency_contact_name,
            emergency_contact_phone: emp.emergency_contact_phone || prev.emergency_contact_phone || "+91 6289672904",
            emergency_contact_phone2: emp.emergency_contact_phone2 || prev.emergency_contact_phone2 || "+91 7699426448",
            joining_date: joinDate,
            expiry_date: expDate,
            document_status: emp.document_status || "Not Uploaded",
          }));

          if (emp.profile_photo) {
            setPhotoPreview(getUploadUrl(emp.profile_photo));
          }
        }
      } catch (err) {
        console.warn("Could not load employee details for ID Card:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentEmpCode, token]);

  // 2. Generate Real Scannable QR Code on Details Change
  useEffect(() => {
    const generateQR = async () => {
      try {
        const vCardData = `BEGIN:VCARD\nVERSION:3.0\nFN:${formData.name}\nTITLE:${formData.designation}\nORG:Zentelex Technologies\nTEL:${formData.phone_no}\nEMAIL:${formData.email}\nNOTE:EmpID:${formData.employee_code} | Blood:${formData.blood_group}\nEND:VCARD`;
        const url = await QRCode.toDataURL(vCardData, {
          width: 140,
          margin: 1,
          color: {
            dark: "#1e293b",
            light: "#ffffff",
          },
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error("QR generation error:", err);
      }
    };

    generateQR();
  }, [formData.name, formData.designation, formData.employee_code, formData.phone_no, formData.email, formData.blood_group]);

  // Form Field Change Handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Photo Selector Handler
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo size should be less than 5MB");
        return;
      }
      setSelectedPhotoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      toast.success("Photo updated on preview");
    }
  };

  // Document File Selector Handler
  const handleDocSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Document size should be less than 10MB");
        return;
      }
      setSelectedDocFile(file);
      toast.success("Identity document attached");
    }
  };

  // Save & Submit ID Card Details to API
  const handleSaveAndSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = new FormData();
      payload.append("dob", formData.dob);
      payload.append("blood_group", formData.blood_group);
      payload.append("phone_no", formData.phone_no);
      payload.append("emergency_contact_name", formData.emergency_contact_name);
      payload.append("emergency_contact_phone", formData.emergency_contact_phone);
      if (formData.emergency_contact_phone2) {
        payload.append("emergency_contact_phone2", formData.emergency_contact_phone2);
      }

      if (selectedPhotoFile) {
        payload.append("profile_photo", selectedPhotoFile);
      }
      if (selectedDocFile) {
        payload.append("doc_id", selectedDocFile);
      }

      const res = await api.post(`/employee/${currentEmpCode}/profile`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("ID Card details and documents saved successfully!");
        setFormData((prev) => ({
          ...prev,
          document_status: "Pending Verification",
        }));
      }
    } catch (err) {
      console.error("Save ID card error:", err);
      toast.error(err.response?.data?.error || "Failed to save ID card details");
    } finally {
      setSaving(false);
    }
  };

  // Format Display Date: YYYY-MM-DD -> DD/MM/YYYY
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString("en-GB");
    } catch {
      return dateStr;
    }
  };

  // Helper to sanitize card elements in cloned DOM before html2canvas rasterizes
  const sanitizeClonedCard = (clonedDoc, side) => {
    const card = clonedDoc.querySelector(`[data-card="${side}"]`) || clonedDoc.body;
    if (card) {
      const all = card.querySelectorAll("*");
      all.forEach((el) => {
        if (el.classList.contains("truncate")) {
          el.classList.remove("truncate");
        }
        // Force visible overflow and normal line-height on text elements to avoid clipping
        if (el !== card) {
          el.style.overflow = "visible";
          el.style.textOverflow = "clip";
          if (!el.classList.contains("whitespace-nowrap") && !el.closest(".whitespace-nowrap")) {
            el.style.whiteSpace = "normal";
          }
        }
      });
    }
  };

  // Download Single Card as PNG
  const handleDownloadImage = async (cardSide) => {
    const cardEl = cardSide === "front" ? frontCardRef.current : backCardRef.current;
    if (!cardEl) {
      toast.error("Card element not found");
      return;
    }

    try {
      toast.loading(`Exporting ${cardSide} ID Card...`, { id: "export" });
      const canvas = await html2canvas(cardEl, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => sanitizeClonedCard(clonedDoc, cardSide),
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Zentelex_ID_Card_${cardSide.toUpperCase()}_${formData.employee_code}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(`${cardSide.toUpperCase()} Card downloaded!`, { id: "export" });
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export card image", { id: "export" });
    }
  };

  // Download Both Sides as a Print-Ready PDF
  const handleDownloadPDF = async () => {
    if (!frontCardRef.current || !backCardRef.current) {
      toast.error("Card elements not found");
      return;
    }

    try {
      toast.loading("Generating printable ID Card PDF...", { id: "pdf" });
      const [frontCanvas, backCanvas] = await Promise.all([
        html2canvas(frontCardRef.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          onclone: (clonedDoc) => sanitizeClonedCard(clonedDoc, "front"),
        }),
        html2canvas(backCardRef.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          onclone: (clonedDoc) => sanitizeClonedCard(clonedDoc, "back"),
        }),
      ]);

      const pdf = new jsPDF("portrait", "mm", "a4");

      // Header on Printable Sheet
      pdf.setFillColor(30, 41, 59);
      pdf.rect(0, 0, 210, 24, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text("ZENTELEX TECHNOLOGIES - OFFICIAL EMPLOYEE ID CARD SHEET", 14, 13);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(203, 213, 225);
      pdf.text(`Employee: ${formData.name} (${formData.employee_code}) | Standard CR80 Size (54mm x 86mm)`, 14, 19);

      // Card Dimensions on Print Page (CR80 standard ratio)
      const cardWidth = 54;
      const cardHeight = 86;

      // Front Card Image
      const frontImg = frontCanvas.toDataURL("image/png");
      pdf.addImage(frontImg, "PNG", 35, 42, cardWidth, cardHeight);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text("FRONT SIDE", 35 + cardWidth / 2, 42 + cardHeight + 6, { align: "center" });

      // Back Card Image
      const backImg = backCanvas.toDataURL("image/png");
      pdf.addImage(backImg, "PNG", 121, 42, cardWidth, cardHeight);
      pdf.text("BACK SIDE", 121 + cardWidth / 2, 42 + cardHeight + 6, { align: "center" });

      // Cut & Lamination Guidelines
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.rect(33, 40, cardWidth + 4, cardHeight + 4);
      pdf.rect(119, 40, cardWidth + 4, cardHeight + 4);

      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        "Printing Instructions: Print on 300+ GSM cardstock or direct PVC card printer. Align punch slot with standard badge strap.",
        105,
        155,
        { align: "center", maxWidth: 160 }
      );

      pdf.save(`ID_Card_${formData.employee_code}_Zentelex.pdf`);
      toast.success("Printable ID Card PDF generated!", { id: "pdf" });
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate ID card PDF", { id: "pdf" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-sm font-medium text-slate-600">Loading ID Card Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 pt-4 text-slate-800">
      <Container fluid className="max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top Header & Breadcrumb */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-md">
                <LuBadgeCheck className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-0">
                    ID-Card & Documents
                  </h1>
                  <Badge
                    bg={
                      formData.document_status === "Verified"
                        ? "success"
                        : formData.document_status === "Pending Verification"
                          ? "warning"
                          : "secondary"
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-full uppercase"
                  >
                    {formData.document_status}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mb-0 mt-0.5">
                  Update details required for corporate ID issuance and preview your official lanyard ID card in real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline-primary"
              size="sm"
              className="rounded-xl px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:!text-black hover:!bg-slate-100 hover:!border-slate-300 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
              onClick={() => handleDownloadImage("front")}
            >
              {/* <LuDownload className="w-3.5 h-3.5" /> */}
              Front PNG
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-xl px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:!text-black hover:!bg-slate-100 hover:!border-slate-300 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
              onClick={() => handleDownloadImage("back")}
            >
              {/* <LuDownload className="w-3.5 h-3.5" /> */}
              Back PNG
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="rounded-xl px-3.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 border-0 flex items-center gap-1.5 shadow-sm"
              onClick={handleDownloadPDF}
            >
              {/* <LuCreditCard className="w-3.5 h-3.5" /> */}
              Download ID PDF
            </Button>
          </div>
        </div>

        {/* Main Grid: Form on Left, Live ID Card Preview on Right */}
        <Row className="g-4">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: EDITABLE DETAILS & DOCUMENT UPLOADS                          */}
          {/* ========================================================================= */}
          <Col lg={6} xl={7}>
            <Card className="border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
              {/* Form Navigation Tabs */}
              <div className="border-b border-slate-100 bg-slate-50/60 px-4 sm:px-6 pt-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("details")}
                    className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "details"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <LuUser className="w-4 h-4" />
                    Card Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("photo")}
                    className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "photo"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <LuImage className="w-4 h-4" />
                    Photo Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("documents")}
                    className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "documents"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <LuFileText className="w-4 h-4" />
                    Identity Proofs
                  </button>
                </div>
              </div>

              <Card.Body className="p-4 sm:p-6">
                <Form onSubmit={handleSaveAndSubmit}>
                  {/* TAB 1: ID CARD PERSONAL & COMPANY DETAILS */}
                  {activeTab === "details" && (
                    <div className="space-y-4">
                      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-800 flex items-start gap-2">
                        <LuSparkles className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
                        <div>
                          <strong>Live Synchronized Form:</strong> Changes made here reflect instantly on the official ID card preview to the right.
                        </div>
                      </div>

                      <Row className="g-3">
                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Employee Full Name
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              placeholder="e.g. Alexander Mitra"
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100 font-medium"
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Employee ID No
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="employee_code"
                              value={formData.employee_code}
                              onChange={handleChange}
                              placeholder="e.g. EMP-RM-66"
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100 font-mono font-bold text-slate-800"
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Official Designation
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="designation"
                              value={formData.designation}
                              onChange={handleChange}
                              placeholder="e.g. MANAGING DIRECTOR"
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100 uppercase font-semibold text-slate-700"
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Department
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="dept"
                              value={formData.dept}
                              onChange={handleChange}
                              placeholder="e.g. Engineering"
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100"
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Official Email ID
                            </Form.Label>
                            <Form.Control
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="e.g. alexander@zentelex.com"
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100"
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Mobile Phone No
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="phone_no"
                              value={formData.phone_no}
                              onChange={handleChange}
                              placeholder="e.g. +91 98765 43210"
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100 font-medium"
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col sm={4}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Date of Birth (DOB)
                            </Form.Label>
                            <Form.Control
                              type="date"
                              name="dob"
                              value={formData.dob || ""}
                              onChange={handleChange}
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100"
                            />
                          </Form.Group>
                        </Col>

                        <Col sm={4}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Blood Group
                            </Form.Label>
                            <Form.Select
                              name="blood_group"
                              value={formData.blood_group || "B+"}
                              onChange={handleChange}
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100 font-bold text-rose-600"
                            >
                              {BLOOD_GROUPS.map((bg) => (
                                <option key={bg} value={bg}>
                                  {bg}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>

                        <Col sm={4}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Date of Joining
                            </Form.Label>
                            <Form.Control
                              type="date"
                              name="joining_date"
                              value={formData.joining_date || ""}
                              onChange={handleChange}
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100"
                            />
                          </Form.Group>
                        </Col>

                        <Col sm={4}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Emergency Contact Name
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="emergency_contact_name"
                              value={formData.emergency_contact_name || ""}
                              onChange={handleChange}
                              placeholder="e.g. Sarah Mitra"
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100"
                            />
                          </Form.Group>
                        </Col>

                        <Col sm={4}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Emergency Contact No 1
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="emergency_contact_phone"
                              value={formData.emergency_contact_phone || ""}
                              onChange={handleChange}
                              placeholder="e.g. +91 6289672904"
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100 font-mono font-medium"
                            />
                          </Form.Group>
                        </Col>

                        <Col sm={4}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Emergency Contact No 2
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="emergency_contact_phone2"
                              value={formData.emergency_contact_phone2 || ""}
                              onChange={handleChange}
                              placeholder="e.g. +91 7699426448"
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100 font-mono font-medium"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* TAB 2: PROFILE PHOTO UPLOAD */}
                  {activeTab === "photo" && (
                    <div className="space-y-4">
                      <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-all">
                        <div className="relative inline-block mb-4">
                          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto bg-slate-200 flex items-center justify-center">
                            {photoPreview ? (
                              <img
                                src={photoPreview}
                                alt="ID Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <LuUser className="w-12 h-12 text-slate-400" />
                            )}
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 mb-1">
                          Upload Badge Portrait Photo
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                          For best results, upload a clear front-facing portrait photo with a plain or neutral background. Supports JPG, PNG up to 5MB.
                        </p>

                        <div className="flex justify-center gap-2">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all">
                            <LuUpload className="w-3.5 h-3.5" />
                            Choose New Photo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoSelect}
                              className="hidden"
                            />
                          </label>

                          {photoPreview && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="rounded-xl text-xs font-medium"
                              onClick={() => {
                                setPhotoPreview(null);
                                setSelectedPhotoFile(null);
                              }}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: IDENTITY DOCUMENTS UPLOAD */}
                  {activeTab === "documents" && (
                    <div className="space-y-4">
                      <Alert variant="info" className="text-xs rounded-2xl mb-3 border-0 bg-cyan-50 text-cyan-900">
                        <strong>HR Verification Required:</strong> Official identity documents are retained securely for statutory compliance and ID badge authorization.
                      </Alert>

                      <Row className="g-3">
                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Primary Government ID
                            </Form.Label>
                            <Form.Select
                              name="doc_id_type"
                              value={formData.doc_id_type}
                              onChange={handleChange}
                              className="text-xs rounded-xl border-slate-200 py-2 focus:ring-blue-100"
                            >
                              <option value="Aadhaar Card">Aadhaar Card (India)</option>
                              <option value="PAN Card">PAN Card</option>
                              <option value="Passport">Passport</option>
                              <option value="Voter ID">Voter ID Card</option>
                              <option value="Driving License">Driving License</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>

                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Document ID Number
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="doc_id_number"
                              value={formData.doc_id_number}
                              onChange={handleChange}
                              placeholder="e.g. 5432-8765-1234"
                              className="text-xs rounded-xl border-slate-200 py-2 font-mono font-medium focus:ring-blue-100"
                            />
                          </Form.Group>
                        </Col>

                        <Col xs={12}>
                          <Form.Group>
                            <Form.Label className="text-xs font-semibold text-slate-600 mb-1">
                              Attach Document File (PDF or Image)
                            </Form.Label>
                            <div className="border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                                  <LuFileText className="w-5 h-5" />
                                </span>
                                <div>
                                  <p className="text-xs font-semibold text-slate-800 mb-0">
                                    {selectedDocFile ? selectedDocFile.name : "No file attached yet"}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mb-0">
                                    {selectedDocFile
                                      ? `${(selectedDocFile.size / 1024).toFixed(1)} KB`
                                      : "Upload front/back scan of your ID (Max 10MB)"}
                                  </p>
                                </div>
                              </div>

                              <label className="cursor-pointer px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all shrink-0">
                                Browse File
                                <input
                                  type="file"
                                  accept=".pdf,image/*"
                                  onChange={handleDocSelect}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* Submit Bar */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Changes auto-preview live
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={saving}
                      className="rounded-xl px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 border-0 shadow-sm flex items-center gap-1.5"
                    >
                      {saving ? (
                        <>
                          <Spinner animation="border" size="sm" />
                          Saving...
                        </>
                      ) : (
                        <>
                          {/* <LuCheck className="w-4 h-4" /> */}
                          Save & Submit for ID Generation
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: LIVE REALISTIC ID CARD PREVIEW (FRONT & BACK)               */}
          {/* ========================================================================= */}
          <Col lg={6} xl={5}>
            <div className="sticky top-6">
              {/* Preview Controls Bar */}
              <div className="mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                {/* View Switcher */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("both")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${viewMode === "both"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Both Sides
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("front")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${viewMode === "front"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Front
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("back")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${viewMode === "back"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Back
                  </button>
                </div>

                {/* Lanyard Color Picker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                    <LuPalette className="w-3.5 h-3.5" />
                    Strap:
                  </span>
                  {LANYARD_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.name}
                      onClick={() => setLanyardColor(c.hex)}
                      className={`w-5 h-5 rounded-full transition-transform ${lanyardColor === c.hex ? "scale-125 ring-2 ring-blue-500 ring-offset-2" : "hover:scale-110 opacity-80"
                        }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* CARD PREVIEW STAGE */}
              <div
                className="bg-slate-100/90 rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-inner flex flex-wrap justify-center items-start gap-6 overflow-x-auto min-h-[580px]"
              >
                {/* ------------------------------------------------------------- */}
                {/* 1. FRONT SIDE ID CARD WITH LANYARD HOLDER                      */}
                {/* ------------------------------------------------------------- */}
                {(viewMode === "both" || viewMode === "front") && (
                  <div className="flex flex-col items-center">
                    {/* Lanyard Strap & Metallic Clip Assembly */}
                    {showLanyard && (
                      <div className="flex flex-col items-center select-none pointer-events-none">
                        {/* Lanyard Strap Ribbon */}
                        <div
                          className="w-9 h-20 rounded-t-sm shadow-md relative overflow-hidden"
                          style={{
                            backgroundColor: lanyardColor,
                            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0, rgba(255,255,255,0.1) 2px, transparent 2px, transparent 4px)",
                          }}
                        >
                          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-slate-300 to-white shadow-inner absolute bottom-2 left-1/2 -translate-x-1/2 border border-slate-400"></div>
                        </div>

                        {/* Metallic Ring Loop */}
                        <div className="w-6 h-3 rounded-full border-2 border-slate-400 bg-transparent -mt-1 shadow-sm"></div>

                        {/* Metallic Lobster Swivel Clasp */}
                        <div className="w-4 h-6 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 rounded-sm shadow-sm -mt-1 relative flex items-center justify-center">
                          <div className="w-1.5 h-3 bg-slate-600/40 rounded-full"></div>
                        </div>

                        {/* Hook beak connecting into badge tab slot */}
                        <div className="w-3.5 h-3 rounded-b-md bg-gradient-to-b from-slate-400 to-slate-600 -mt-1 shadow-md"></div>
                      </div>
                    )}

                    {/* Badge Holder Frame (Matte Black with Top Slot & Side Clips) */}
                    <div className="relative pt-2">
                      {/* Top Hanger Tab with Badge Slot */}
                      <div className="w-40 h-7 mx-auto bg-slate-900 rounded-t-xl flex items-center justify-center relative shadow-sm">
                        <div className="w-14 h-2.5 rounded-full bg-slate-100/90 border border-slate-700 shadow-inner"></div>
                      </div>

                      {/* Main Frame Wrapper */}
                      <div className="relative p-1.5 bg-slate-900 rounded-2xl shadow-2xl">
                        {/* Left Side Retention Grip Tab */}
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-16 bg-slate-900 rounded-l-md border-r border-slate-800 shadow-md"></div>
                        {/* Right Side Retention Grip Tab */}
                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-16 bg-slate-900 rounded-r-md border-l border-slate-800 shadow-md"></div>

                        {/* ======================================================= */}
                        {/* ACTUAL CR80 FRONT ID CARD CONTENT                      */}
                        {/* ======================================================= */}
                        <div
                          ref={frontCardRef}
                          data-card="front"
                          className="w-[260px] h-[415px] bg-white rounded-xl overflow-hidden relative shadow-md flex flex-col justify-between font-sans select-none"
                          style={{ boxSizing: "border-box" }}
                        >
                          {/* Modern Vector Background Artwork */}
                          <svg
                            width="260"
                            height="415"
                            viewBox="0 0 260 415"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="absolute inset-0 w-full h-full pointer-events-none z-0"
                          >
                            {/* Top Left Green Diagonal Block */}
                            <path d="M0 0 L85 0 L168 128 L0 238 Z" fill="#52b635" />
                            {/* Top Right Royal Blue Diagonal Shape */}
                            <path d="M148 102 L260 166 L260 270 L168 146 Z" fill="#2864b8" />
                            {/* Bottom Left Dark Navy Accent */}
                            <path d="M0 370 C16 370 34 388 42 415 L0 415 Z" fill="#1e1b4b" />
                            {/* Bottom Left Green Curved Swoop */}
                            <path d="M0 358 C24 358 56 384 84 415 L42 415 C34 388 16 370 0 370 Z" fill="#52b635" />
                          </svg>

                          {/* Card Content Container */}
                          <div className="relative z-10 h-full flex flex-col justify-between pb-3">
                            <div>
                              {/* Top Header with Zentelex Logo */}
                              <div className="flex justify-end pt-3 pr-3.5">
                                <img
                                  src={logo}
                                  alt="Zentelex"
                                  className="h-7 w-auto object-contain"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              </div>

                              {/* Hexagon Profile Photo */}
                              <div className="mt-2.5 flex justify-center">
                                <div
                                  style={{
                                    width: "114px",
                                    height: "128px",
                                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                                    WebkitClipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                                    backgroundColor: "#52b635",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: "106px",
                                      height: "120px",
                                      clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                                      WebkitClipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                                      backgroundColor: "#ffffff",
                                      overflow: "hidden",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    {photoPreview ? (
                                      <img
                                        src={photoPreview}
                                        alt={formData.name}
                                        crossOrigin="anonymous"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <LuUser className="w-12 h-12 text-slate-400" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Employee Name & Designation */}
                              <div className="text-center mt-2 px-3">
                                <h2 className="text-[18px] font-extrabold text-[#1e1b4b] leading-tight tracking-tight m-0">
                                  {formData.name || "Saptarsi Mitra"}
                                </h2>
                                <div className="mt-1.5 inline-block bg-[#52b635] text-[#0f172a] text-[11px] font-semibold px-4 py-1 rounded-lg leading-normal shadow-sm">
                                  {formData.designation || "Associate Software Engineer"}
                                </div>
                              </div>

                              {/* Dynamic Credentials Table */}
                              <div className="mt-5 pl-10 pr-6 space-y-1 text-[12px] leading-relaxed">
                                <div className="flex items-center">
                                  <span className="w-[84px] font-bold text-[#1e1b4b] tracking-wide shrink-0">
                                    EMP ID
                                  </span>
                                  <span className="font-bold text-[#1e1b4b] mr-2 shrink-0">:</span>
                                  <span className="font-bold text-[#1e1b4b] truncate">
                                    {formData.employee_code || "ZEN00025"}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <span className="w-[84px] font-bold text-[#1e1b4b] tracking-wide shrink-0">
                                    BLOOD GR
                                  </span>
                                  <span className="font-bold text-[#1e1b4b] mr-2 shrink-0">:</span>
                                  <span className="font-bold text-[#1e1b4b] truncate">
                                    {formData.blood_group || "B+"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Bottom Website with Globe Icon */}
                            <div className="flex items-center justify-center gap-1.5 text-[10.5px] font-medium text-[#1e1b4b]">
                              <span>www.zentelex.com</span>
                              <LuGlobe className="w-3.5 h-3.5 text-[#52b635] shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-center mt-2">
                        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                          Front Side
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 2. BACK SIDE ID CARD WITH LANYARD HOLDER                       */}
                {/* ------------------------------------------------------------- */}
                {(viewMode === "both" || viewMode === "back") && (
                  <div className="flex flex-col items-center">
                    {/* Lanyard Strap & Metallic Clip Assembly */}
                    {showLanyard && (
                      <div className="flex flex-col items-center select-none pointer-events-none">
                        <div
                          className="w-9 h-20 rounded-t-sm shadow-md relative overflow-hidden"
                          style={{
                            backgroundColor: lanyardColor,
                            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0, rgba(255,255,255,0.1) 2px, transparent 2px, transparent 4px)",
                          }}
                        >
                          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-slate-300 to-white shadow-inner absolute bottom-2 left-1/2 -translate-x-1/2 border border-slate-400"></div>
                        </div>
                        <div className="w-6 h-3 rounded-full border-2 border-slate-400 bg-transparent -mt-1 shadow-sm"></div>
                        <div className="w-4 h-6 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 rounded-sm shadow-sm -mt-1 relative flex items-center justify-center">
                          <div className="w-1.5 h-3 bg-slate-600/40 rounded-full"></div>
                        </div>
                        <div className="w-3.5 h-3 rounded-b-md bg-gradient-to-b from-slate-400 to-slate-600 -mt-1 shadow-md"></div>
                      </div>
                    )}

                    {/* Badge Holder Frame */}
                    <div className="relative pt-2">
                      <div className="w-40 h-7 mx-auto bg-slate-900 rounded-t-xl flex items-center justify-center relative shadow-sm">
                        <div className="w-14 h-2.5 rounded-full bg-slate-100/90 border border-slate-700 shadow-inner"></div>
                      </div>

                      <div className="relative p-1.5 bg-slate-900 rounded-2xl shadow-2xl">
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-16 bg-slate-900 rounded-l-md border-r border-slate-800 shadow-md"></div>
                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-16 bg-slate-900 rounded-r-md border-l border-slate-800 shadow-md"></div>

                        {/* ======================================================= */}
                        {/* ACTUAL CR80 BACK ID CARD CONTENT                       */}
                        {/* ======================================================= */}
                        <div
                          ref={backCardRef}
                          data-card="back"
                          className="w-[260px] h-[415px] bg-white rounded-xl overflow-hidden relative shadow-md flex flex-col justify-between font-sans select-none"
                          style={{ boxSizing: "border-box" }}
                        >
                          {/* Modern Vector Background Artwork */}
                          <svg
                            width="260"
                            height="415"
                            viewBox="0 0 260 415"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="absolute inset-0 w-full h-full pointer-events-none z-0"
                          >
                            {/* Top Right Royal Blue Polygon */}
                            <path d="M100 0 L260 0 L260 142 L165 92 Z" fill="#2864b8" />
                            {/* Top Left Green Angled Bar */}
                            <rect
                              x="-18"
                              y="10"
                              width="128"
                              height="42"
                              rx="21"
                              transform="rotate(-30 -18 10)"
                              fill="#52b635"
                            />
                            {/* Bottom Left Dark Navy Accent */}
                            <path d="M0 370 C16 370 34 388 42 415 L0 415 Z" fill="#1e1b4b" />
                            {/* Bottom Left Green Curved Swoop */}
                            <path d="M0 358 C24 358 56 384 84 415 L42 415 C34 388 16 370 0 370 Z" fill="#52b635" />
                          </svg>

                          {/* Card Content Container */}
                          <div className="relative z-10 h-full flex flex-col justify-between px-4 pt-4 pb-3">
                            <div>
                              {/* Title */}
                              <div className="mt-16">
                                <h1 className="m-0 text-[18px] font-black text-[#1e1b4b] leading-[1.15] tracking-tight">
                                  TERMS &amp;<br />CONDITIONS
                                </h1>
                                <div className="w-8 h-1 bg-[#52b635] rounded-full mt-2 mb-3"></div>
                              </div>

                              {/* Identification & Policy Details */}
                              <div className="text-[9.5px] text-[#334155] leading-[1.42] space-y-2">
                                <p className="m-0">
                                  <strong className="text-[#1e1b4b] font-bold">Identification:</strong> Carry the ID card at all times during working hours for identification purposes.
                                </p>
                                <p className="m-0">
                                  <strong className="text-[#1e1b4b] font-bold">Authorized Use:</strong> The ID card is strictly for official use and should not be shared or used for unauthorized purposes.
                                </p>
                              </div>

                              {/* Company Address */}
                              <div className="mt-3 text-[9.5px] leading-snug">
                                <div className="font-bold text-[#1e1b4b] mb-0.5">Address:</div>
                                <div className="text-[#334155]">
                                  Harmony heaven, 27 Rajdanga<br />
                                  Main Road Kolkata 700107
                                </div>
                              </div>

                              {/* Emergency Helpline Pill */}
                              <div className="mt-3.5 bg-[#52b635] rounded-[18px] px-3 py-2 flex items-center justify-between shadow-sm">
                                <div className="text-[#e11d48] font-bold text-[10.5px] shrink-0 whitespace-nowrap">
                                  Emergency. No:
                                </div>
                                <div className="text-white font-bold text-[10.5px] leading-tight text-right shrink-0 whitespace-nowrap pl-2">
                                  <div className="whitespace-nowrap" style={{ whiteSpace: "nowrap" }}>
                                    {formData.emergency_contact_phone || "+91 6289672904"}
                                  </div>
                                  <div className="whitespace-nowrap" style={{ whiteSpace: "nowrap" }}>
                                    {formData.emergency_contact_phone2 || "+91 7699426448"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Bottom Website with Globe Icon */}
                            <div className="flex items-center justify-center gap-1.5 text-[10.5px] font-medium text-[#1e1b4b]">
                              <span>www.zentelex.com</span>
                              <LuGlobe className="w-3.5 h-3.5 text-[#52b635] shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-center mt-2">
                        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                          Back Side
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lanyard & Frame Toggle Options */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-2">
                <Form.Check
                  type="switch"
                  id="lanyardToggle"
                  label="Show Lanyard & Badge Clip"
                  checked={showLanyard}
                  onChange={(e) => setShowLanyard(e.target.checked)}
                  className="font-medium cursor-pointer"
                />
                <span className="text-[11px] text-slate-400">Standard CR80 54×86mm</span>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
