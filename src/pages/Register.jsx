import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  Form,
  Button,
  Container,
  Row,
  Col,
  Card,
  InputGroup,
  Table,
  Badge,
  Spinner,
  Modal,
} from "react-bootstrap";

const DEFAULT_PASSWORD = "Admin@123";
const API_BASE = "http://localhost:5007";
const UPLOAD_BASE = "http://localhost:5007";

const styleSheet = document.createElement("style");
styleSheet.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
* { font-family: 'Plus Jakarta Sans', sans-serif; }
.edu-section-wrap{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 40%,#166534 100%);border-radius:24px;padding:28px;box-shadow:0 8px 32px rgba(15,23,42,.18);position:relative;overflow:hidden}
.edu-entry-card{background:rgba(255,255,255,.97);border:none!important;border-radius:18px!important;box-shadow:0 4px 24px rgba(15,23,42,.13)!important;transition:transform .25s,box-shadow .25s!important;overflow:hidden}
.edu-entry-card:hover{transform:translateY(-3px)!important;box-shadow:0 12px 36px rgba(15,23,42,.18)!important}
.edu-field-label{font-size:10px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px;display:flex;align-items:center;gap:4px}
.edu-input{border:2px solid #e2e8f0!important;border-radius:10px!important;font-size:13px!important;font-weight:500!important;transition:border-color .2s,box-shadow .2s!important;padding:10px 12px!important;background:#f8fafc!important}
.edu-input:focus{border-color:#166534!important;box-shadow:0 0 0 4px rgba(22,163,74,.12)!important;background:#fff!important}
.edu-select{border:2px solid #e2e8f0!important;border-radius:10px!important;font-size:13px!important;font-weight:500!important;padding:10px 12px!important;background:#f8fafc!important;transition:border-color .2s,box-shadow .2s!important;cursor:pointer!important}
.edu-select:focus{border-color:#166534!important;box-shadow:0 0 0 4px rgba(22,163,74,.12)!important;background:#fff!important}
.btn-download-pro{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none;color:#fff;background:linear-gradient(135deg,#1d4ed8 0%,#3b82f6 50%,#60a5fa 100%);box-shadow:0 4px 20px rgba(59,130,246,.4);transition:all .35s cubic-bezier(.34,1.56,.64,1);position:relative;overflow:hidden;border:none;letter-spacing:.3px}
.btn-download-pro:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 12px 30px rgba(59,130,246,.5);color:#fff}
.emp-card-header{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1a365d 100%)!important;color:#fff!important;border-bottom:2px solid rgba(99,179,237,.2)!important;box-shadow:0 8px 24px rgba(0,0,0,.25);position:relative;overflow:hidden}
.emp-card-header h1{font-weight:800!important;color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.3);letter-spacing:-.5px}
.emp-card-header h2{color:rgba(255,255,255,.75)!important;font-weight:500!important}
.doc-preview-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:50px;font-size:12px;font-weight:700;border:2px solid #3b82f6;background:#eff6ff;color:#1d4ed8;transition:all .3s cubic-bezier(.175,.885,.32,1.275);box-shadow:0 2px 8px rgba(59,130,246,.1);cursor:pointer}
.doc-preview-btn:hover{background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;transform:scale(1.06) translateY(-2px);box-shadow:0 6px 18px rgba(59,130,246,.35);border-color:transparent}
.doc-repo-table{width:100%;border-collapse:separate;border-spacing:0}
.doc-repo-table thead tr{background:linear-gradient(135deg,#0f172a,#1e3a5f)}
.doc-repo-table thead th{color:#e2e8f0;font-size:11px;font-weight:700;padding:12px 14px;border:none;white-space:nowrap;text-transform:uppercase;letter-spacing:.6px}
.doc-repo-table thead th:first-child{border-radius:12px 0 0 0}
.doc-repo-table thead th:last-child{border-radius:0 12px 0 0}
.doc-repo-row{transition:background .2s}
.doc-repo-row:hover{background:#f0f7ff}
.doc-repo-row td{padding:12px 14px;border-bottom:1px solid #e2e8f0;vertical-align:middle;font-size:13px}
.upload-label{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:50px;font-size:12px;font-weight:700;background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1d4ed8;border:2px solid #93c5fd;cursor:pointer;transition:all .25s;white-space:nowrap;box-shadow:0 2px 6px rgba(59,130,246,.1)}
.upload-label:hover{background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;border-color:#1d4ed8;transform:translateY(-2px);box-shadow:0 6px 16px rgba(29,78,216,.3)}
.upload-label input{display:none}
.upload-label-error{border-color:#ef4444!important;background:linear-gradient(135deg,#fff5f5,#fee2e2)!important;color:#dc2626!important}
.status-badge-uploaded{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:50px;font-size:11px;font-weight:700;background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#15803d;border:1.5px solid #86efac;box-shadow:0 2px 6px rgba(22,163,74,.15)}
.status-badge-pending{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:50px;font-size:11px;font-weight:700;background:linear-gradient(135deg,#fef9c3,#fef08a);color:#a16207;border:1.5px solid #fde047;box-shadow:0 2px 6px rgba(161,98,7,.12)}
.status-badge-required{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:50px;font-size:11px;font-weight:700;background:linear-gradient(135deg,#fee2e2,#fecaca);color:#dc2626;border:1.5px solid #f87171;animation:pulse-red 1.5s infinite;box-shadow:0 2px 6px rgba(220,38,38,.15)}
@keyframes pulse-red{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.35)}50%{box-shadow:0 0 0 5px rgba(220,38,38,0)}}
.lang-section-wrap{background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 60%,#d1fae5 100%);border:2px solid #86efac;border-radius:20px;padding:24px;box-shadow:0 4px 20px rgba(22,163,74,.08)}
.lang-row-card{display:flex;align-items:center;gap:12px;background:#fff;border:2px solid #bbf7d0;border-radius:14px;padding:12px 14px;margin-bottom:10px;flex-wrap:wrap;transition:box-shadow .25s,border-color .25s,transform .2s;box-shadow:0 2px 8px rgba(22,163,74,.06)}
.lang-row-card:hover{box-shadow:0 6px 20px rgba(22,101,52,.12);border-color:#4ade80;transform:translateY(-1px)}
.lang-name-tag{min-width:95px;font-size:13px;font-weight:700;color:#166534;flex-shrink:0;background:linear-gradient(135deg,#dcfce7,#bbf7d0);padding:4px 10px;border-radius:8px;border:1px solid #86efac}
.lang-skill-group{display:flex;gap:10px;flex:1;flex-wrap:wrap}
.lang-skill-item{display:flex;flex-direction:column;gap:4px;min-width:72px}
.lang-skill-label{font-size:9px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.8px}
.lang-skill-select{border:2px solid #86efac;border-radius:8px;font-size:12px;font-weight:600;padding:5px 8px;outline:none;cursor:pointer;transition:border-color .2s,box-shadow .2s,background .2s}
.lang-skill-select:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.15)}
.lang-skill-select.yes{color:#166534;background:linear-gradient(135deg,#f0fdf4,#dcfce7)}
.lang-skill-select.no{color:#dc2626;background:linear-gradient(135deg,#fff5f5,#fee2e2);border-color:#fca5a5}
.remove-lang-btn{background:#fee2e2;border:2px solid #fca5a5;color:#dc2626;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;line-height:1;padding:0;margin-left:auto;flex-shrink:0;transition:all .2s;box-shadow:0 2px 6px rgba(220,38,38,.12)}
.remove-lang-btn:hover{background:#dc2626;color:#fff;transform:scale(1.15) rotate(90deg);box-shadow:0 4px 12px rgba(220,38,38,.3)}
.add-lang-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 20px;border-radius:50px;font-size:12px;font-weight:700;background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#166534;border:2px solid #86efac;cursor:pointer;transition:all .25s;box-shadow:0 2px 8px rgba(22,163,74,.1)}
.add-lang-btn:hover{background:linear-gradient(135deg,#15803d,#16a34a);color:#fff;border-color:#15803d;transform:translateY(-2px);box-shadow:0 6px 16px rgba(22,101,52,.3)}
.resume-upload-box{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 16px;border:2.5px dashed #86efac;border-radius:16px;background:#fff;cursor:pointer;transition:all .25s;box-shadow:0 2px 12px rgba(22,163,74,.06)}
.resume-upload-box:hover{border-color:#16a34a;background:#f0fdf4;transform:translateY(-2px);box-shadow:0 8px 24px rgba(22,163,74,.14)}
.resume-upload-box.uploaded{border-style:solid;border-color:#16a34a;background:linear-gradient(135deg,#f0fdf4,#dcfce7);box-shadow:0 4px 16px rgba(22,163,74,.15)}
.family-section{background:linear-gradient(135deg,#fdf4ff 0%,#fae8ff 60%,#f3e8ff 100%);border:2px solid #e9d5ff;border-radius:20px;padding:26px;box-shadow:0 4px 20px rgba(109,40,217,.07)}
.family-section h5{color:#7c3aed!important}
.child-card{background:#fff;border:2px solid #e9d5ff;border-radius:14px;padding:16px;position:relative;transition:box-shadow .25s,border-color .25s,transform .2s;box-shadow:0 2px 8px rgba(109,40,217,.06)}
.child-card:hover{box-shadow:0 6px 20px rgba(109,40,217,.12);border-color:#c4b5fd;transform:translateY(-1px)}
.remove-child-btn{background:#fee2e2;border:2px solid #fca5a5;color:#dc2626;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;transition:all .2s;line-height:1;padding:0}
.remove-child-btn:hover{background:#dc2626;color:#fff;transform:scale(1.15) rotate(90deg)}
.add-child-btn-son{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:50px;font-size:12px;font-weight:700;background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1e40af;border:2px solid #93c5fd;cursor:pointer;transition:all .25s;box-shadow:0 2px 8px rgba(30,64,175,.1)}
.add-child-btn-son:hover{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;border-color:#1e40af;transform:translateY(-2px);box-shadow:0 6px 14px rgba(30,64,175,.28)}
.add-child-btn-daughter{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:50px;font-size:12px;font-weight:700;background:linear-gradient(135deg,#fce7f3,#fbcfe8);color:#9d174d;border:2px solid #f9a8d4;cursor:pointer;transition:all .25s;box-shadow:0 2px 8px rgba(157,23,77,.1)}
.add-child-btn-daughter:hover{background:linear-gradient(135deg,#9d174d,#db2777);color:#fff;border-color:#9d174d;transform:translateY(-2px);box-shadow:0 6px 14px rgba(157,23,77,.28)}
.family-summary-bar{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;padding:12px 16px;background:#fff;border-radius:12px;border:1.5px solid #e9d5ff;box-shadow:0 2px 8px rgba(109,40,217,.06)}
.family-stat{font-size:12px;font-weight:700;color:#7c3aed}
.exp-entry-card{background:#fff;border:2px solid #fed7aa;border-radius:16px;padding:20px;position:relative;transition:box-shadow .25s,border-color .25s,transform .2s;margin-bottom:16px;box-shadow:0 2px 10px rgba(234,88,12,.07)}
.exp-entry-card:hover{box-shadow:0 8px 24px rgba(234,88,12,.14);border-color:#fb923c;transform:translateY(-2px)}
.exp-entry-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px dashed #fed7aa}
.exp-entry-badge{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#fff7ed,#ffedd5);color:#c2410c;border:2px solid #fb923c;border-radius:50px;padding:5px 16px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(194,65,12,.12)}
.remove-exp-btn{background:#fee2e2;border:2px solid #fca5a5;color:#dc2626;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;transition:all .2s;line-height:1;padding:0}
.remove-exp-btn:hover{background:#dc2626;color:#fff;transform:scale(1.15) rotate(90deg)}
.duration-badge{display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#065f46;border:1.5px solid #6ee7b7;border-radius:50px;padding:3px 12px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(6,95,70,.1)}
.add-exp-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:50px;font-size:13px;font-weight:700;background:linear-gradient(135deg,#fff7ed,#ffedd5);color:#c2410c;border:2px solid #fb923c;cursor:pointer;transition:all .25s;box-shadow:0 4px 12px rgba(194,65,12,.1)}
.add-exp-btn:hover{background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;border-color:#ea580c;transform:translateY(-3px);box-shadow:0 8px 20px rgba(234,88,12,.3)}
.exp-section-wrap{background:linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%);border:2px solid #fed7aa;border-radius:20px;padding:24px;box-shadow:0 4px 20px rgba(234,88,12,.07)}
.exp-field-label{font-size:10px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px}
.exp-input{border:2px solid #fed7aa!important;border-radius:10px!important;font-size:13px!important;font-weight:500!important;transition:border-color .2s,box-shadow .2s!important;padding:10px 12px!important}
.exp-input:focus{border-color:#f97316!important;box-shadow:0 0 0 4px rgba(249,115,22,.12)!important}
.exp-summary-strip{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;padding:12px 16px;background:#fff;border-radius:12px;border:2px solid #fed7aa;font-size:12px;box-shadow:0 2px 8px rgba(234,88,12,.07)}
.exp-summary-item{font-weight:700;color:#c2410c;display:flex;align-items:center;gap:5px}
.prof-entry-card{background:#fff;border:2px solid #a5f3fc;border-radius:16px;padding:20px;position:relative;transition:box-shadow .25s,border-color .25s,transform .2s;margin-bottom:16px;box-shadow:0 2px 10px rgba(6,182,212,.07)}
.prof-entry-card:hover{box-shadow:0 8px 24px rgba(6,182,212,.14);border-color:#22d3ee;transform:translateY(-2px)}
.prof-entry-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px dashed #a5f3fc}
.prof-entry-badge{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#ecfeff,#cffafe);color:#0e7490;border:2px solid #67e8f9;border-radius:50px;padding:5px 16px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(14,116,144,.12)}
.remove-prof-btn{background:#fee2e2;border:2px solid #fca5a5;color:#dc2626;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;transition:all .2s;line-height:1;padding:0}
.remove-prof-btn:hover{background:#dc2626;color:#fff;transform:scale(1.15) rotate(90deg)}
.prof-field-label{font-size:10px;font-weight:800;color:#0e7490;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px}
.prof-input{border:2px solid #a5f3fc!important;border-radius:10px!important;font-size:13px!important;font-weight:500!important;transition:border-color .2s,box-shadow .2s!important;padding:10px 12px!important}
.prof-input:focus{border-color:#06b6d4!important;box-shadow:0 0 0 4px rgba(6,182,212,.12)!important}
.prof-section-wrap{background:linear-gradient(135deg,#ecfeff 0%,#cffafe 100%);border:2px solid #a5f3fc;border-radius:20px;padding:24px;box-shadow:0 4px 20px rgba(6,182,212,.07)}
.prof-duration-badge{display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#065f46;border:1.5px solid #6ee7b7;border-radius:50px;padding:3px 12px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(6,95,70,.1)}
.prof-summary-strip{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;padding:12px 16px;background:#fff;border-radius:12px;border:2px solid #a5f3fc;font-size:12px;box-shadow:0 2px 8px rgba(6,182,212,.07)}
.prof-summary-item{font-weight:700;color:#0e7490;display:flex;align-items:center;gap:5px}
.add-prof-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:50px;font-size:13px;font-weight:700;background:linear-gradient(135deg,#ecfeff,#cffafe);color:#0e7490;border:2px solid #67e8f9;cursor:pointer;transition:all .25s;box-shadow:0 4px 12px rgba(8,145,178,.1)}
.add-prof-btn:hover{background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;border-color:#0891b2;transform:translateY(-3px);box-shadow:0 8px 20px rgba(8,145,178,.3)}
.doc-error-row td{background:#fff5f5!important}
.doc-error-msg{font-size:11px;color:#dc2626;font-weight:700;margin-top:5px;display:flex;align-items:center;gap:4px}
.doc-modal-img{max-width:95%;max-height:75vh;border-radius:18px;box-shadow:0 25px 50px rgba(0,0,0,.35);border:6px solid #fff}
.emp-table-wrap{border-radius:14px;overflow:hidden}
.emp-table td,.emp-table th{font-size:11px;padding:14px 10px}
@media(max-width:575px){
  .emp-card-header{padding:1.75rem 1rem!important;text-align:center}
  .emp-card-header h1{font-size:1.3rem!important;margin-bottom:6px}
  .search-control{width:100%!important;height:44px!important;font-size:14px!important;border-radius:12px!important}
  .btn-download-pro{width:100%;justify-content:center}
}
@media(max-width:768px){
  .lang-section-wrap,.family-section,.exp-section-wrap,.prof-section-wrap{padding:16px}
  .exp-entry-card,.prof-entry-card{padding:14px}
  .resume-upload-box{padding:18px 12px}
}
@media(max-width:480px){
  .lang-skill-group{gap:6px}
  .lang-skill-item{min-width:60px}
  .add-exp-btn,.add-prof-btn,.add-lang-btn{width:100%;justify-content:center;padding:11px}
}
`;
if (!document.head.contains(styleSheet)) {
  document.head.appendChild(styleSheet);
}

const calcDuration = (from, to) => {
  if (!from || !to) return null;
  const f = new Date(from),
    t = new Date(to);
  if (isNaN(f) || isNaN(t) || t < f) return null;
  let months =
    (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth());
  const years = Math.floor(months / 12),
    rem = months % 12;
  if (years === 0) return `${rem} month${rem !== 1 ? "s" : ""}`;
  if (rem === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} yr ${rem} mo`;
};

const getFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  if (filePath.startsWith("/uploads/")) return `${UPLOAD_BASE}${filePath}`;
  return `${UPLOAD_BASE}/uploads/${filePath}`;
};
const isPdfFile = (filePath) =>
  filePath && filePath.toLowerCase().endsWith(".pdf");
const avatarUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&background=0d6efd&color=fff&size=42`;

const REQUIRED_DOC_FIELDS = [
  { name: "photo", label: "Photo" },
  { name: "aadhaar", label: "Aadhaar Card" },
  { name: "pan", label: "PAN Card" },
  { name: "madhyamikAdmit", label: "Madhyamik Admit Card" },
  { name: "cert10", label: "10th Certificate" },
  { name: "cert12", label: "12th Certificate" },
];

const examOptions = [
  "Madhyamik",
  "HS (Higher Secondary)",
  "Graduate",
  "Masters",
  "Others",
];

const collegeUniversityMap = {
  "Presidency College, Kolkata": "University of Calcutta",
  "St. Xavier's College, Kolkata": "University of Calcutta",
  "Scottish Church College": "University of Calcutta",
  "Bethune College": "University of Calcutta",
  "Lady Brabourne College": "University of Calcutta",
  "Maulana Azad College": "University of Calcutta",
  "Asutosh College": "University of Calcutta",
  "Vidyasagar College": "Vidyasagar University",
  "Surendranath College": "University of Calcutta",
  "City College, Kolkata": "University of Calcutta",
  "Goenka College of Commerce and Business Administration":
    "University of Calcutta",
  "Heramba Chandra College": "University of Calcutta",
  "Dinabandhu Andrews College": "West Bengal State University (WBSU)",
  "Acharya Jagadish Chandra Bose College": "University of Calcutta",
  "Seth Anandram Jaipuria College": "University of Calcutta",
  "Bangabasi College": "West Bengal State University (WBSU)",
  "South City College": "University of Calcutta",
  "The Bhawanipur Education Society College": "University of Calcutta",
  "Calcutta Medical College": "University of Calcutta",
  "R.G. Kar Medical College": "University of Calcutta",
  "NRS Medical College": "University of Calcutta",
  "SSKM Medical College": "University of Calcutta",
  "KPC Medical College": "University of Calcutta",
  "Heritage Institute of Technology": "MAKAUT",
  "Techno India": "MAKAUT",
  "JIS College of Engineering": "MAKAUT",
  "Narula Institute of Technology": "MAKAUT",
  "Future Institute of Engineering and Management": "MAKAUT",
  "Meghnad Saha Institute of Technology": "MAKAUT",
  "Budge Budge Institute of Technology": "MAKAUT",
  "St. Xavier's College, Mumbai": "University of Mumbai",
  "Fergusson College, Pune": "Savitribai Phule Pune University (SPPU)",
  "Christ University, Bangalore": "Christ University (Deemed)",
  "Loyola College, Chennai": "University of Madras",
  "Miranda House, Delhi": "University of Delhi",
  "Hans Raj College, Delhi": "University of Delhi",
  "Kirori Mal College, Delhi": "University of Delhi",
  "St. Stephen's College, Delhi": "University of Delhi",
  "Ramjas College, Delhi": "University of Delhi",
  "Hindu College, Delhi": "University of Delhi",
  "SRCC (Shri Ram College of Commerce)": "University of Delhi",
  "Lady Shri Ram College for Women": "University of Delhi",
  "Mount Carmel College, Bangalore": "Bangalore University",
  "Madras Christian College": "University of Madras",
};

const boardOnlyOptions = [
  "WBBSE (West Bengal Board)",
  "WBCHSE (West Bengal HS Board)",
  "CBSE",
  "ICSE / ISC",
  "Bihar Board (BSEB)",
  "UP Board (UPMSP)",
  "MP Board (MPBSE)",
  "Rajasthan Board (RBSE)",
  "Maharashtra Board (MSBSHSE)",
  "Gujarat Board (GSEB)",
  "Karnataka Board (KSEEB)",
  "Tamil Nadu Board (TNBSE)",
  "Andhra Pradesh Board (BSEAP)",
  "Telangana Board (BSETS)",
  "Kerala Board (DHSE)",
  "Odisha Board (BSE)",
  "Assam Board (SEBA / AHSEC)",
  "Jharkhand Board (JAC)",
  "Chhattisgarh Board (CGBSE)",
  "Uttarakhand Board (UBSE)",
  "Himachal Board (HPBOSE)",
  "Punjab Board (PSEB)",
  "Haryana Board (HBSE)",
  "Delhi Board (DSSSB)",
  "Goa Board (GBSHSE)",
  "Others",
];

const getEduErrors = (edu) => {
  const errors = {};
  const currentYear = new Date().getFullYear();
  if (!edu.examName?.trim()) errors.examName = "Exam name is required";
  const isGradMasters = ["Graduate", "Masters", "Others"].includes(
    edu.examName,
  );
  if (isGradMasters) {
    if (edu.boardType !== "university") {
      if (!edu.board?.trim()) errors.board = "College is required";
      if (edu.board === "Others" && !edu.otherBoard?.trim())
        errors.otherBoard = "Please specify college name";
    } else {
      if (!edu.manualUniversity?.trim())
        errors.manualUniversity = "University name is required";
    }
  } else {
    if (!edu.board?.trim()) errors.board = "Board is required";
    if (edu.board === "Others" && !edu.otherBoard?.trim())
      errors.otherBoard = "Please specify board name";
  }
  if (!edu.yearOfPassing) errors.yearOfPassing = "Year of passing is required";
  else if (!/^\d{4}$/.test(String(edu.yearOfPassing)))
    errors.yearOfPassing = "Enter valid 4-digit year";
  else if (
    parseInt(edu.yearOfPassing) < 1950 ||
    parseInt(edu.yearOfPassing) > currentYear
  )
    errors.yearOfPassing = `Year must be between 1950–${currentYear}`;
  if (!edu.fromDate) errors.fromDate = "From date is required";
  if (!edu.toDate) errors.toDate = "To date is required";
  if (edu.fromDate && edu.toDate) {
    const from = new Date(edu.fromDate),
      to = new Date(edu.toDate);
    if (from > to) errors.toDate = "End date must be after start date";
    if (to > new Date()) errors.toDate = "To date cannot be in future";
  }
  if (!edu.totalMarks) errors.totalMarks = "Total marks is required";
  else if (isNaN(edu.totalMarks) || parseFloat(edu.totalMarks) <= 0)
    errors.totalMarks = "Must be a positive number";
  if (!edu.marksObtained) errors.marksObtained = "Marks obtained is required";
  else if (isNaN(edu.marksObtained) || parseFloat(edu.marksObtained) < 0)
    errors.marksObtained = "Cannot be negative";
  else if (
    edu.totalMarks &&
    parseFloat(edu.marksObtained) > parseFloat(edu.totalMarks)
  )
    errors.marksObtained = "Cannot exceed total marks";
  if (!edu.subjectTaken?.trim()) errors.subjectTaken = "Subject is required";
  if (!edu.grade?.trim()) errors.grade = "Grade is required";
  else if (!/^[A-Za-z0-9+\-.\s]+$/.test(edu.grade))
    errors.grade = "Invalid grade format";
  else if (edu.grade.length > 10) errors.grade = "Max 10 characters allowed";
  if (["Graduate", "Masters"].includes(edu.examName)) {
    if (!edu.courseName?.trim()) errors.courseName = "Course name is required";
  }
  return errors;
};

// ── objectURLCache: memory leak prevent করতে ──
const objectURLCache = new WeakMap();
const getObjectURL = (file) => {
  if (!file) return null;
  if (objectURLCache.has(file)) return objectURLCache.get(file);
  const url = URL.createObjectURL(file);
  objectURLCache.set(file, url);
  return url;
};

const DocPreview = memo(({ filename, label, onPreview }) => {
  if (!filename) return null;
  const url = getFileUrl(filename);
  const isPdf = isPdfFile(filename);
  return (
    <button
      type="button"
      className="doc-preview-btn"
      onClick={() => onPreview({ url, label, isPdf })}
    >
      {isPdf ? (
        <span style={{ fontSize: "16px" }}>📄</span>
      ) : (
        <img
          src={url}
          alt={label}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid #fff",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}
      <span>{label}</span>
    </button>
  );
});

const EducationTableInRow = memo(({ emp, onPreview }) => {
  const eduArr = useMemo(() => {
    try {
      return emp.education_data ? JSON.parse(emp.education_data) : [];
    } catch {
      return [];
    }
  }, [emp.education_data]);

  if (eduArr.length === 0) return null;
  return (
    <div className="mb-4 p-3 bg-white rounded-3 border shadow-sm">
      <h6
        className="fw-bold mb-3"
        style={{ color: "#166534", fontSize: "13px" }}
      >
        🎓 Educational Qualifications
      </h6>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            tableLayout: "fixed",
            minWidth: "600px",
          }}
        >
          <thead>
            <tr style={{ background: "#f0fdf4" }}>
              {[
                "Examination",
                "Board / College",
                "Year",
                "Subject / Course",
                "Marks",
                "%",
                "Grade",
                "Cert.",
              ].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: "9px 12px",
                    textAlign: "left",
                    color: "#166534",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderBottom: "1.5px solid #86efac",
                    whiteSpace: "nowrap",
                    width: ["14%", "20%", "8%", "20%", "13%", "8%", "8%", "9%"][
                      i
                    ],
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eduArr.map((edu, i) => {
              const pct =
                edu.marksObtained &&
                  edu.totalMarks &&
                  parseFloat(edu.totalMarks) > 0 &&
                  parseFloat(edu.marksObtained) <= parseFloat(edu.totalMarks)
                  ? (
                    (parseFloat(edu.marksObtained) /
                      parseFloat(edu.totalMarks)) *
                    100
                  ).toFixed(1)
                  : null;
              const boardDisplay =
                edu.board === "Others"
                  ? edu.otherBoard || "Others"
                  : edu.board || "—";
              const subjectDisplay =
                edu.subjectTaken === "Others"
                  ? edu.otherSubject || "Others"
                  : edu.subjectTaken || "—";
              const courseDisplay = edu.courseName
                ? edu.courseName === "Others"
                  ? edu.otherCourseName || "Others"
                  : edu.courseName
                : null;
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "0.5px solid #dcfce7",
                    background: i % 2 === 0 ? "#fff" : "#fafffe",
                  }}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        background: "#dcfce7",
                        color: "#166534",
                        border: "1px solid #86efac",
                        borderRadius: "20px",
                        padding: "3px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        display: "inline-block",
                      }}
                    >
                      {edu.examName || "—"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "#1e293b",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{boardDisplay}</div>
                    {edu.autoUniversity && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        🏛️ {edu.autoUniversity}
                      </div>
                    )}
                    {edu.collegeName && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        🏫 {edu.collegeName}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    {edu.yearOfPassing || "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "#1e293b",
                      fontSize: "12px",
                    }}
                  >
                    <div>{subjectDisplay}</div>
                    {courseDisplay && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        📖 {courseDisplay}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "#1e293b",
                      fontSize: "12px",
                    }}
                  >
                    {edu.marksObtained && edu.totalMarks
                      ? `${edu.marksObtained} / ${edu.totalMarks}`
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {pct ? (
                      <span
                        style={{
                          background: "#dbeafe",
                          color: "#1e40af",
                          borderRadius: "20px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pct}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "#1e293b",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {edu.grade || "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {edu.fileName ? (
                      <button
                        type="button"
                        className="doc-preview-btn"
                        onClick={() =>
                          onPreview({
                            url: getFileUrl(edu.fileName),
                            isPdf: edu.fileName.toLowerCase().endsWith(".pdf"),
                            label: `🎓 ${edu.examName || "Certificate"}`,
                          })
                        }
                        style={{ fontSize: "11px", padding: "4px 10px" }}
                      >
                        👁️ View
                      </button>
                    ) : (
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#94a3b8",
                          borderRadius: "20px",
                          padding: "2px 8px",
                          fontSize: "11px",
                        }}
                      >
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: "10px",
          padding: "8px 12px",
          background: "#f0fdf4",
          borderRadius: "8px",
          border: "1px dashed #86efac",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          fontSize: "11px",
          color: "#166534",
        }}
      >
        <span style={{ fontWeight: 600 }}>
          Total: {eduArr.length} qualification{eduArr.length !== 1 ? "s" : ""}
        </span>
        {eduArr.map((e, i) => (
          <span key={i}>
            🎓 {e.examName}
            {e.yearOfPassing ? ` (${e.yearOfPassing})` : ""}
          </span>
        ))}
      </div>
    </div>
  );
});

const EmployeeRow = memo(
  ({ emp, idx, isExpanded, onToggle, onDelete, onPreview }) => {
    const expArr = useMemo(() => {
      try {
        return JSON.parse(emp.experience_data || "[]");
      } catch {
        return [];
      }
    }, [emp.experience_data]);
    const profArr = useMemo(() => {
      try {
        return JSON.parse(emp.professional_data || "[]");
      } catch {
        return [];
      }
    }, [emp.professional_data]);
    const langArr = useMemo(() => {
      try {
        return JSON.parse(emp.languages_data || "[]");
      } catch {
        return [];
      }
    }, [emp.languages_data]);
    const sonsArr = useMemo(() => {
      try {
        return JSON.parse(emp.sons_data || "[]");
      } catch {
        return [];
      }
    }, [emp.sons_data]);
    const daughtersArr = useMemo(() => {
      try {
        return JSON.parse(emp.daughters_data || "[]");
      } catch {
        return [];
      }
    }, [emp.daughters_data]);

    const availableDocs = useMemo(() => {
      const docs = [
        { label: "📸 Photo", key: "photo" },
        { label: "🪪 Aadhaar", key: "aadhaar" },
        { label: "💳 PAN", key: "pan" },
        { label: "🗳️ Voter Card", key: "voter" },
        { label: "🛂 Passport", key: "passport" },
        { label: "💍 Marriage Cert.", key: "marriage" },
        { label: "📋 Madhyamik Admit", key: "madhyamik_admit" },
        { label: "📄 10th Cert.", key: "cert_10" },
        { label: "📄 12th Cert.", key: "cert_12" },
        { label: "🎓 Graduation Cert.", key: "grad_certificate" },
        { label: "🏛️ Master's Cert.", key: "master_certificate" },
        { label: "📄 Resume", key: "resume" },
      ];
      return docs.filter((d) => emp[d.key]);
    }, [emp]);

    return (
      <React.Fragment>
        <tr className="border-bottom">
          <td className="px-3 text-muted small">{idx + 1}</td>
          <td>
            <div className="d-flex align-items-center">
              <img
                src={emp.photo ? getFileUrl(emp.photo) : avatarUrl(emp.name)}
                alt={emp.name}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  objectFit: "cover",
                  border: "1px solid #eee",
                }}
                className="me-2 shadow-sm"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = avatarUrl(emp.name);
                }}
                loading="lazy"
              />
              <div>
                <div
                  className="fw-bold text-dark mb-0"
                  style={{ fontSize: "14px" }}
                >
                  {emp.name || "—"}
                </div>
                <div className="text-muted" style={{ fontSize: "11px" }}>
                  {emp.fathers_name || "—"}
                </div>
              </div>
            </div>
          </td>
          <td>
            <code
              className="bg-light px-2 py-1 rounded text-primary fw-bold"
              style={{ fontSize: "12px" }}
            >
              {emp.employee_id || "—"}
            </code>
          </td>
          <td>
            <div className="small text-dark">{emp.email || "—"}</div>
            <div className="text-muted small">{emp.mobile_no || "—"}</div>
          </td>
          <td>
            {emp.department ? (
              <Badge
                bg="light"
                className="text-dark border px-2 py-1 fw-normal"
              >
                {emp.department}
              </Badge>
            ) : (
              "—"
            )}
          </td>
          <td className="small">{emp.designation || "—"}</td>
          <td className="text-center">
            {emp.blood_group ? (
              <Badge
                bg="danger"
                className="rounded-pill px-2"
                style={{ fontSize: "10px" }}
              >
                {emp.blood_group}
              </Badge>
            ) : (
              "—"
            )}
          </td>
          <td className="text-center">
            {emp.marital_status ? (
              <Badge
                pill
                bg={emp.marital_status === "Married" ? "success" : "secondary"}
                style={{ fontSize: "10px" }}
              >
                {emp.marital_status}
              </Badge>
            ) : (
              "—"
            )}
          </td>
          <td className="text-center">
            <Button
              variant={isExpanded ? "primary" : "outline-primary"}
              size="sm"
              className="rounded-pill px-3"
              style={{ fontSize: "11px" }}
              onClick={() => onToggle(emp.id)}
            >
              {isExpanded ? "✕ Close" : "View"}
            </Button>
          </td>
          <td className="text-center">
            <Button
              variant="link"
              className="text-danger p-0"
              onClick={() => onDelete(emp.id, emp.name)}
            >
              <span style={{ fontSize: "18px" }}>🗑️</span>
            </Button>
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={10} className="p-0">
              <div
                className="p-3 shadow-sm"
                style={{
                  background: "linear-gradient(to right,#f0f4ff,#ffffff)",
                  borderLeft: "4px solid #0d6efd",
                }}
              >
                <div className="mb-4 p-3 bg-white rounded-3 border shadow-sm">
                  <h6
                    className="fw-bold mb-3"
                    style={{ color: "#6d28d9", fontSize: "13px" }}
                  >
                    Parents Information
                  </h6>
                  <Row className="g-3">
                    <Col xs={12} sm={6} md={4}>
                      <div className="fw-semibold small text-muted mb-1">
                        Father's Name
                      </div>
                      <div className="fw-bold" style={{ color: "#1e1b4b" }}>
                        {emp.fathers_name && emp.fathers_name !== "N/A"
                          ? emp.fathers_name
                          : "—"}
                      </div>
                    </Col>
                    <Col xs={6} sm={3} md={2}>
                      <div className="fw-semibold small text-muted mb-1">
                        Father's Age
                      </div>
                      <div className="fw-bold" style={{ color: "#1e1b4b" }}>
                        {emp.fathers_age || "—"}
                      </div>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                      <div className="fw-semibold small text-muted mb-1">
                        Mother's Name
                      </div>
                      <div className="fw-bold" style={{ color: "#1e1b4b" }}>
                        {emp.mothers_name || "—"}
                      </div>
                    </Col>
                    <Col xs={6} sm={3} md={2}>
                      <div className="fw-semibold small text-muted mb-1">
                        Mother's Age
                      </div>
                      <div className="fw-bold" style={{ color: "#1e1b4b" }}>
                        {emp.mothers_age || "—"}
                      </div>
                    </Col>
                    {emp.spouse_name && (
                      <>
                        <Col xs={12} sm={6} md={4}>
                          <div className="fw-semibold small text-muted mb-1">
                            Spouse Name
                          </div>
                          <div className="fw-bold" style={{ color: "#1e1b4b" }}>
                            💍 {emp.spouse_name}
                          </div>
                        </Col>
                        <Col xs={6} sm={3} md={2}>
                          <div className="fw-semibold small text-muted mb-1">
                            Spouse Age
                          </div>
                          <div className="fw-bold" style={{ color: "#1e1b4b" }}>
                            {emp.spouse_age || "—"}
                          </div>
                        </Col>
                      </>
                    )}
                    {(emp.number_of_sons > 0 ||
                      emp.number_of_daughters > 0) && (
                        <Col xs={12}>
                          <div className="fw-semibold small text-muted mb-2">
                            Children
                          </div>
                          <div className="d-flex gap-3 flex-wrap">
                            {emp.number_of_sons > 0 && (
                              <span
                                style={{
                                  background: "#dbeafe",
                                  color: "#1e40af",
                                  border: "1px solid #93c5fd",
                                  borderRadius: "8px",
                                  padding: "4px 12px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                }}
                              >
                                👦 Sons: {emp.number_of_sons}
                              </span>
                            )}
                            {emp.number_of_daughters > 0 && (
                              <span
                                style={{
                                  background: "#fce7f3",
                                  color: "#9d174d",
                                  border: "1px solid #f9a8d4",
                                  borderRadius: "8px",
                                  padding: "4px 12px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                }}
                              >
                                👧 Daughters: {emp.number_of_daughters}
                              </span>
                            )}
                          </div>
                          {sonsArr.length > 0 && (
                            <div className="mt-2 d-flex flex-wrap gap-2">
                              {sonsArr.map((s, i) => (
                                <span
                                  key={i}
                                  style={{
                                    background: "#eff6ff",
                                    border: "1px solid #bfdbfe",
                                    borderRadius: "8px",
                                    padding: "4px 10px",
                                    fontSize: "11px",
                                  }}
                                >
                                  👦 <strong>{s.name || `Son ${i + 1}`}</strong>
                                  {s.age ? ` — Age: ${s.age}` : ""}
                                  {s.dob ? ` (${s.dob})` : ""}
                                </span>
                              ))}
                            </div>
                          )}
                          {daughtersArr.length > 0 && (
                            <div className="mt-2 d-flex flex-wrap gap-2">
                              {daughtersArr.map((d, i) => (
                                <span
                                  key={i}
                                  style={{
                                    background: "#fdf4ff",
                                    border: "1px solid #e9d5ff",
                                    borderRadius: "8px",
                                    padding: "4px 10px",
                                    fontSize: "11px",
                                  }}
                                >
                                  👧{" "}
                                  <strong>{d.name || `Daughter ${i + 1}`}</strong>
                                  {d.age ? ` — Age: ${d.age}` : ""}
                                  {d.dob ? ` (${d.dob})` : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        </Col>
                      )}
                    {emp.family_address && (
                      <Col xs={12}>
                        <div className="fw-semibold small text-muted mb-1">
                          Family Address
                        </div>
                        <div style={{ fontSize: "13px", color: "#374151" }}>
                          📍 {emp.family_address}
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>

                {langArr.length > 0 && (
                  <div
                    className="mb-3 p-3 rounded-3"
                    style={{
                      background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                      border: "1.5px solid #86efac",
                    }}
                  >
                    <h6
                      className="fw-bold mb-2"
                      style={{ color: "#166534", fontSize: "12px" }}
                    >
                      🗣️ Languages Known
                    </h6>
                    <div className="d-flex flex-wrap gap-2">
                      {langArr.map((l, i) => (
                        <span
                          key={i}
                          style={{
                            background: "#fff",
                            border: "1px solid #bbf7d0",
                            borderRadius: "8px",
                            padding: "5px 10px",
                            fontSize: "11px",
                          }}
                        >
                          <strong style={{ color: "#166534" }}>{l.name}</strong>
                          <span style={{ color: "#6b7280", marginLeft: "6px" }}>
                            R:{l.read === "yes" ? "✔" : "✗"} W:
                            {l.write === "yes" ? "✔" : "✗"} S:
                            {l.speak === "yes" ? "✔" : "✗"}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <EducationTableInRow emp={emp} onPreview={onPreview} />

                {profArr.length > 0 &&
                  profArr.some((p) => p.name || p.companyName) && (
                    <div className="mb-4 p-3 bg-white rounded-3 border shadow-sm">
                      <h6
                        className="fw-bold mb-3"
                        style={{ color: "#0e7490", fontSize: "13px" }}
                      >
                        🏅 Professional Education
                      </h6>
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "12px",
                            minWidth: "500px",
                          }}
                        >
                          <thead>
                            <tr style={{ background: "#ecfeff" }}>
                              {[
                                "Degree / Certificate",
                                "Institution",
                                "From",
                                "To",
                                "Grade",
                                "Marks",
                                "Validity",
                              ].map((h, i) => (
                                <th
                                  key={i}
                                  style={{
                                    padding: "8px 12px",
                                    color: "#0e7490",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    borderBottom: "1.5px solid #a5f3fc",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {profArr
                              .filter((p) => p.name || p.companyName)
                              .map((p, i) => (
                                <tr
                                  key={i}
                                  style={{
                                    borderBottom: "0.5px solid #cffafe",
                                    background:
                                      i % 2 === 0 ? "#fff" : "#f0fdfe",
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      fontWeight: 600,
                                      color: "#0e7490",
                                    }}
                                  >
                                    {p.name || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#374151",
                                    }}
                                  >
                                    {p.companyName || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#64748b",
                                    }}
                                  >
                                    {p.fromDate || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#64748b",
                                    }}
                                  >
                                    {p.toDate || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#166534",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {p.grade || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#374151",
                                    }}
                                  >
                                    {p.marksObtained && p.totalMarks
                                      ? `${p.marksObtained}/${p.totalMarks}`
                                      : "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#64748b",
                                    }}
                                  >
                                    {p.validity || "—"}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {expArr.length > 0 && expArr.some((e) => e.companyName) && (
                  <div className="mb-4 p-3 bg-white rounded-3 border shadow-sm">
                    <h6
                      className="fw-bold mb-3"
                      style={{ color: "#c2410c", fontSize: "13px" }}
                    >
                      💼 Work Experience
                    </h6>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "12px",
                          minWidth: "600px",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "#fff7ed" }}>
                            {[
                              "Company",
                              "Designation",
                              "From",
                              "To",
                              "Duration",
                              "CTC",
                              "Reporting To",
                              "Remarks",
                            ].map((h, i) => (
                              <th
                                key={i}
                                style={{
                                  padding: "8px 12px",
                                  color: "#c2410c",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  borderBottom: "1.5px solid #fed7aa",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {expArr
                            .filter((e) => e.companyName)
                            .map((exp, i) => {
                              const dur = calcDuration(
                                exp.fromDate,
                                exp.toDate,
                              );
                              return (
                                <tr
                                  key={i}
                                  style={{
                                    borderBottom: "0.5px solid #ffedd5",
                                    background:
                                      i % 2 === 0 ? "#fff" : "#fffbf7",
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      fontWeight: 600,
                                      color: "#c2410c",
                                    }}
                                  >
                                    {exp.companyName || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#374151",
                                    }}
                                  >
                                    {exp.designation || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#64748b",
                                    }}
                                  >
                                    {exp.fromDate || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#64748b",
                                    }}
                                  >
                                    {exp.toDate || "—"}
                                  </td>
                                  <td style={{ padding: "9px 12px" }}>
                                    {dur ? (
                                      <span
                                        style={{
                                          background: "#d1fae5",
                                          color: "#065f46",
                                          borderRadius: "20px",
                                          padding: "2px 8px",
                                          fontSize: "11px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {dur}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#374151",
                                    }}
                                  >
                                    {exp.ctc || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#374151",
                                    }}
                                  >
                                    {exp.reportingName || "—"}
                                    {exp.reportingDesignation && (
                                      <div
                                        style={{
                                          fontSize: "10px",
                                          color: "#64748b",
                                        }}
                                      >
                                        {exp.reportingDesignation}
                                      </div>
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      padding: "9px 12px",
                                      color: "#64748b",
                                    }}
                                  >
                                    {exp.remarks || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {availableDocs.length > 0 && (
                  <div className="mb-3 p-3 bg-white rounded-3 border shadow-sm">
                    <h6
                      className="fw-bold mb-3"
                      style={{ color: "#6366f1", fontSize: "13px" }}
                    >
                      📂 Documents
                    </h6>
                    <div className="d-flex flex-wrap gap-2">
                      {availableDocs.map((doc, i) => {
                        const url = getFileUrl(emp[doc.key]);
                        const isPdf = isPdfFile(emp[doc.key]);
                        return (
                          <button
                            key={i}
                            type="button"
                            className="doc-preview-btn"
                            onClick={() =>
                              onPreview({ url, label: doc.label, isPdf })
                            }
                          >
                            {isPdf ? (
                              "📄"
                            ) : (
                              <img
                                src={url}
                                alt={doc.label}
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                                loading="lazy"
                              />
                            )}
                            {doc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  },
);

// ── Main Component ──
const Register = () => {
  const [authStep, setAuthStep] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loggedEmployee, setLoggedEmployee] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    fathersName: "",
    empId: "",
    email: "",
    department: "",
    phone: "",
    emergencyContact: "",
    addressPresent: "",
    addressPermanent: "",
    bloodGroup: "",
    maritalStatus: "",
    jobRole: "",
    extraActivity: "",
  });

  const [languages, setLanguages] = useState([
    {
      name: "English",
      read: "yes",
      write: "yes",
      speak: "yes",
      removable: false,
    },
    { name: "Hindi", read: "yes", write: "yes", speak: "yes", removable: true },
  ]);
  const [resumeFile, setResumeFile] = useState(null);
  const [familyData, setFamilyData] = useState({
    fathersName: "",
    fathersAge: "",
    mothersName: "",
    mothersAge: "",
    spouseName: "",
    spouseAge: "",
    familyAddress: "",
  });
  const [sons, setSons] = useState([]);
  const [daughters, setDaughters] = useState([]);
  const [educationEntries, setEducationEntries] = useState([
    {
      examName: "Madhyamik",
      board: "",
      otherBoard: "",
      yearOfPassing: "",
      fromDate: "",
      toDate: "",
      totalMarks: "",
      marksObtained: "",
      subjectTaken: "",
      remarks: "",
      grade: "",
      file: null,
      fileName: "",
      boardType: "board",
    },
  ]);
  const [educationErrors, setEducationErrors] = useState([]);
  const [professionalFiles, setProfessionalFiles] = useState([
    {
      name: "",
      file: null,
      companyName: "",
      grade: "",
      marksObtained: "",
      totalMarks: "",
      validity: "",
      fromDate: "",
      toDate: "",
    },
  ]);
  const [experienceEntries, setExperienceEntries] = useState([
    {
      companyName: "",
      designation: "",
      fromDate: "",
      toDate: "",
      reportingName: "",
      reportingDesignation: "",
      ctc: "",
      remarks: "",
      file: null,
      fileName: "",
    },
  ]);
  const [errors, setErrors] = useState({});
  const [docErrors, setDocErrors] = useState({});
  const [files, setFiles] = useState({
    photo: null,
    aadhaar: null,
    pan: null,
    voter: null,
    passport: null,
    marriage: null,
    madhyamikAdmit: null,
    cert10: null,
    cert12: null,
    gradCertificate: null,
    masterCertificate: null,
  });
  const [showChildren, setShowChildren] = useState(false);
  const [showSons, setShowSons] = useState(false);
  const [showDaughters, setShowDaughters] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [backendError, setBackendError] = useState(false);
  const [previewModal, setPreviewModal] = useState({
    show: false,
    url: "",
    label: "",
    isPdf: false,
  });

  // ── FIXED: stable handlePreview ──
  const handlePreview = useCallback(({ url, label, isPdf }) => {
    setPreviewModal({ show: true, url, label, isPdf: !!isPdf });
  }, []);

  const closePreview = useCallback(() => {
    setPreviewModal({ show: false, url: "", label: "", isPdf: false });
  }, []);

  const addLanguage = useCallback(() => {
    const name = window.prompt("Enter language name:");
    if (!name?.trim()) return;
    setLanguages((prev) => [
      ...prev,
      {
        name: name.trim(),
        read: "yes",
        write: "yes",
        speak: "yes",
        removable: true,
      },
    ]);
  }, []);
  const removeLanguage = useCallback(
    (idx) => setLanguages((prev) => prev.filter((_, i) => i !== idx)),
    [],
  );
  const updateLanguage = useCallback(
    (idx, field, value) =>
      setLanguages((prev) =>
        prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
      ),
    [],
  );

  const handleFamilyChange = useCallback((e) => {
    const { name, value } = e.target;
    if (["mothersAge", "fathersAge", "spouseAge"].includes(name)) {
      setFamilyData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 3),
      }));
    } else {
      setFamilyData((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  const addSon = useCallback(
    () => setSons((prev) => [...prev, { name: "", age: "", dob: "" }]),
    [],
  );
  const removeSon = useCallback(
    (idx) => setSons((prev) => prev.filter((_, i) => i !== idx)),
    [],
  );
  const updateSon = useCallback(
    (idx, field, value) =>
      setSons((prev) =>
        prev.map((s, i) =>
          i === idx
            ? {
              ...s,
              [field]:
                field === "age"
                  ? value.replace(/\D/g, "").slice(0, 3)
                  : value,
            }
            : s,
        ),
      ),
    [],
  );
  const addDaughter = useCallback(
    () => setDaughters((prev) => [...prev, { name: "", age: "", dob: "" }]),
    [],
  );
  const removeDaughter = useCallback(
    (idx) => setDaughters((prev) => prev.filter((_, i) => i !== idx)),
    [],
  );
  const updateDaughter = useCallback(
    (idx, field, value) =>
      setDaughters((prev) =>
        prev.map((d, i) =>
          i === idx
            ? {
              ...d,
              [field]:
                field === "age"
                  ? value.replace(/\D/g, "").slice(0, 3)
                  : value,
            }
            : d,
        ),
      ),
    [],
  );

  const addEducationEntry = useCallback(
    () =>
      setEducationEntries((prev) => [
        ...prev,
        {
          examName: "",
          board: "",
          otherBoard: "",
          yearOfPassing: "",
          fromDate: "",
          toDate: "",
          totalMarks: "",
          marksObtained: "",
          subjectTaken: "",
          remarks: "",
          grade: "",
          file: null,
          fileName: "",
        },
      ]),
    [],
  );
  const removeEducationEntry = useCallback((idx) => {
    setEducationEntries((prev) => prev.filter((_, i) => i !== idx));
    setEducationErrors((prev) => prev.filter((_, i) => i !== idx));
  }, []);
  const updateEducationEntry = useCallback((idx, field, value) => {
    setEducationEntries((prev) =>
      prev.map((e, i) => {
        if (i !== idx) return e;
        if (field === "examName")
          return {
            ...e,
            [field]: value,
            board: "",
            otherBoard: "",
            autoUniversity: "",
            boardType: ["Graduate", "Masters", "Others"].includes(value)
              ? "college"
              : "board",
          };
        if (field === "board") {
          const autoUniversity = collegeUniversityMap[value] || "";
          return { ...e, [field]: value, autoUniversity };
        }
        return { ...e, [field]: value };
      }),
    );
    setEducationErrors((prev) => {
      if (!prev[idx]?.[field]) return prev;
      const updated = [...prev];
      if (updated[idx]) updated[idx] = { ...updated[idx], [field]: "" };
      return updated;
    });
  }, []);
  const handleEducationFileChange = useCallback(
    (idx, file) =>
      setEducationEntries((prev) =>
        prev.map((e, i) =>
          i === idx ? { ...e, file, fileName: file ? file.name : "" } : e,
        ),
      ),
    [],
  );

  const addProfessionalField = useCallback(
    () =>
      setProfessionalFiles((prev) => [
        ...prev,
        {
          name: "",
          file: null,
          companyName: "",
          grade: "",
          marksObtained: "",
          totalMarks: "",
          validity: "",
          fromDate: "",
          toDate: "",
        },
      ]),
    [],
  );
  const removeProfessionalField = useCallback(
    (idx) => setProfessionalFiles((prev) => prev.filter((_, i) => i !== idx)),
    [],
  );
  const handleProfessionalChange = useCallback((e, index) => {
    setProfessionalFiles((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], file: e.target.files[0] };
      return u;
    });
  }, []);
  const handleProfessionalNameChange = useCallback((e, index) => {
    setProfessionalFiles((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], name: e.target.value };
      return u;
    });
  }, []);
  const handleProfessionalFieldChange = useCallback((index, field, value) => {
    setProfessionalFiles((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], [field]: value };
      return u;
    });
  }, []);

  const addExperienceEntry = useCallback(
    () =>
      setExperienceEntries((prev) => [
        ...prev,
        {
          companyName: "",
          designation: "",
          fromDate: "",
          toDate: "",
          reportingName: "",
          reportingDesignation: "",
          ctc: "",
          remarks: "",
          file: null,
          fileName: "",
        },
      ]),
    [],
  );
  const removeExperienceEntry = useCallback(
    (idx) => setExperienceEntries((prev) => prev.filter((_, i) => i !== idx)),
    [],
  );
  const updateExperienceEntry = useCallback(
    (idx, field, value) =>
      setExperienceEntries((prev) =>
        prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
      ),
    [],
  );
  const handleExperienceFileChange = useCallback(
    (idx, file) =>
      setExperienceEntries((prev) =>
        prev.map((e, i) =>
          i === idx ? { ...e, file, fileName: file ? file.name : "" } : e,
        ),
      ),
    [],
  );

  const handleToggleRow = useCallback(
    (id) => setExpandedRow((prev) => (prev === id ? null : id)),
    [],
  );

  const fetchEmployees = useCallback(async () => {
    setLoadingList(true);
    setBackendError(false);
    try {
      const res = await fetch(`${API_BASE}/api/employees`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) setEmployees(data.data);
      else setEmployees([]);
    } catch (err) {
      setBackendError(true);
      setEmployees([]);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    if (authStep === "main") fetchEmployees();
  }, [authStep, fetchEmployees]);

  const deleteEmployee = useCallback(async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/employees/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success)
        setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      else alert("❌ " + data.message);
    } catch {
      alert("❌ Backend is not running!");
    }
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === "phone" || name === "emergencyContact") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  }, []);

  const handleFileChange = useCallback((e) => {
    const { name } = e.target;
    setFiles((prev) => ({ ...prev, [name]: e.target.files[0] }));
    setDocErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  }, []);

  const filtered = useMemo(
    () =>
      employees.filter(
        (emp) =>
          (emp.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (emp.employee_id || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (emp.department || "").toLowerCase().includes(search.toLowerCase()) ||
          (emp.email || "").toLowerCase().includes(search.toLowerCase()),
      ),
    [employees, search],
  );

  const getDocStatus = useCallback(
    (file, name) => {
      if (file) {
        if (file.type?.startsWith("image/")) {
          const previewUrl = getObjectURL(file);
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <img
                src={previewUrl}
                alt="preview"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  objectFit: "cover",
                  border: "2px solid #86efac",
                }}
              />
              <span className="status-badge-uploaded">OK</span>
            </div>
          );
        }
        if (file.name?.toLowerCase().endsWith(".pdf")) {
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg,#fee2e2,#fecaca)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  border: "2px solid #fca5a5",
                }}
              >
                📄
              </span>
              <span className="status-badge-uploaded">OK</span>
            </div>
          );
        }
        return <span className="status-badge-uploaded">OK</span>;
      }
      if (name && docErrors[name])
        return <span className="status-badge-required">❗ Required</span>;
      return <span className="status-badge-pending">⏳ Pending</span>;
    },
    [docErrors],
  );

  const err = useCallback(
    (field) => (errors[field] ? "is-invalid" : ""),
    [errors],
  );
  const eduErr = useCallback(
    (idx, field) => educationErrors[idx]?.[field] || "",
    [educationErrors],
  );

  const validate = useCallback(() => {
    const e = {};
    if (!formData.name.trim()) e.name = "Full Name is required.";
    if (!formData.fathersName.trim())
      e.fathersName = "Father's Name is required.";
    if (!formData.empId.trim()) e.empId = "Employee ID is required.";
    if (!formData.email.trim()) e.email = "Work Email is required.";
    else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(formData.email))
      e.email = "Only @gmail.com allowed.";
    if (!formData.department) e.department = "Department is required.";
    if (!formData.phone.trim()) e.phone = "Phone Number is required.";
    else if (!/^\d{10}$/.test(formData.phone))
      e.phone = "Phone must be 10 digits.";
    if (!formData.emergencyContact.trim())
      e.emergencyContact = "Emergency Contact is required.";
    else if (!/^\d{10}$/.test(formData.emergencyContact))
      e.emergencyContact = "Emergency contact must be 10 digits.";
    if (!formData.bloodGroup) e.bloodGroup = "Blood Group is required.";
    if (!formData.maritalStatus)
      e.maritalStatus = "Marital Status is required.";
    if (!formData.jobRole.trim()) e.jobRole = "Job Role is required.";
    if (!formData.addressPresent.trim())
      e.addressPresent = "Present Address is required.";
    if (!formData.addressPermanent.trim())
      e.addressPermanent = "Permanent Address is required.";
    if (!formData.extraActivity.trim())
      e.extraActivity = "Skills/Extra Activities is required.";
    return e;
  }, [formData]);

  const validateDocs = useCallback(() => {
    const de = {};
    REQUIRED_DOC_FIELDS.forEach((doc) => {
      if (!files[doc.name]) de[doc.name] = `Please upload ${doc.label}`;
    });
    return de;
  }, [files]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    const cleanEmail = loginEmail.replace(/\s+/g, "").toLowerCase();
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: loginPassword }),
      });
      const result = await response.json();
      if (result.success) {
        setLoggedEmployee(result.employee);
        if (loginPassword === DEFAULT_PASSWORD) setAuthStep("change-password");
        else setAuthStep("main");
        setLoginEmail("");
        setLoginPassword("");
      } else {
        alert("❌ " + result.message);
      }
    } catch {
      alert("❌ Backend (Port 5001) is not running!");
    }
    setLoginLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("❌ Passwords do not match!");
      return;
    }
    if (newPassword.length < 6) {
      alert("❌ Password must be at least 6 characters.");
      return;
    }
    if (newPassword === DEFAULT_PASSWORD) {
      alert("❌ New password cannot be the default password.");
      return;
    }
    setChangeLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loggedEmployee.email,
          oldPassword: DEFAULT_PASSWORD,
          newPassword,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert("✅ Password changed! Welcome.");
        setAuthStep("main");
      } else alert("❌ " + result.message);
    } catch {
      alert("❌ Backend is not running!");
    }
    setChangeLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    const documentErrors = validateDocs();
    const eduErrors = educationEntries.map(getEduErrors);
    const hasEduError = eduErrors.some((err) => Object.keys(err).length > 0);
    const hasFormErrors = Object.keys(validationErrors).length > 0;
    const hasDocErrors = Object.keys(documentErrors).length > 0;

    if (hasFormErrors || hasDocErrors || hasEduError) {
      setErrors(validationErrors);
      setDocErrors(documentErrors);
      setEducationErrors(eduErrors);
      if (hasFormErrors) {
        const el = document.getElementsByName(
          Object.keys(validationErrors)[0],
        )[0];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (hasEduError) {
        document
          .getElementById("edu-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (hasDocErrors) {
        document
          .getElementById("doc-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    setErrors({});
    setDocErrors({});
    setEducationErrors([]);

    const payload = {
      employeeId: formData.empId,
      name: formData.name,
      fathersName: formData.fathersName,
      designation: formData.jobRole,
      department: formData.department,
      email: formData.email.replace(/\s+/g, "").toLowerCase(),
      password: DEFAULT_PASSWORD,
      mobileNo: formData.phone,
      emergencyContact: formData.emergencyContact,
      bloodGroup: formData.bloodGroup,
      maritalStatus: formData.maritalStatus,
      presentAddress: formData.addressPresent,
      permanentAddress: formData.addressPermanent,
      highestQualification: formData.jobRole,
      extraActivity: formData.extraActivity,
      fathersAge: familyData.fathersAge,
      mothersName: familyData.mothersName,
      mothersAge: familyData.mothersAge,
      spouseName: familyData.spouseName,
      spouseAge: familyData.spouseAge,
      familyAddress: familyData.familyAddress,
      numberOfSons: sons.length,
      numberOfDaughters: daughters.length,
      sonsData: JSON.stringify(sons),
      daughtersData: JSON.stringify(daughters),
      languagesData: JSON.stringify(
        languages.map((l) => ({
          name: l.name,
          read: l.read,
          write: l.write,
          speak: l.speak,
        })),
      ),
      educationData: JSON.stringify(
        educationEntries.map((e) => ({
          examName: e.examName,
          board: e.board === "Others" ? e.otherBoard : e.board,
          yearOfPassing: e.yearOfPassing,
          fromDate: e.fromDate,
          toDate: e.toDate,
          totalMarks: e.totalMarks,
          marksObtained: e.marksObtained,
          subjectTaken: e.subjectTaken,
          grade: e.grade || "",
          fileName: e.fileName,
          courseName:
            e.courseName === "Others" ? e.otherCourseName : e.courseName || "",
        })),
      ),
      professionalData: JSON.stringify(
        professionalFiles.map((p) => ({
          name: p.name,
          companyName: p.companyName,
          grade: p.grade || "",
          marksObtained: p.marksObtained || "",
          totalMarks: p.totalMarks || "",
          validity: p.validity || "",
          fromDate: p.fromDate,
          toDate: p.toDate,
          fileName: p.file ? p.file.name : "",
        })),
      ),
      experienceData: JSON.stringify(
        experienceEntries.map((e) => ({
          companyName: e.companyName,
          designation: e.designation,
          fromDate: e.fromDate,
          toDate: e.toDate,
          reportingName: e.reportingName,
          reportingDesignation: e.reportingDesignation,
          ctc: e.ctc || "",
          remarks: e.remarks || "",
          fileName: e.fileName,
        })),
      ),
    };

    const formDataToSend = new FormData();
    Object.keys(payload).forEach((key) =>
      formDataToSend.append(key, payload[key]),
    );
    Object.keys(files).forEach((key) => {
      if (files[key]) formDataToSend.append(key, files[key]);
    });
    if (resumeFile) formDataToSend.append("resume", resumeFile);
    educationEntries.forEach((item, i) => {
      if (item.file) formDataToSend.append(`educationCert_${i}`, item.file);
      [
        "examName",
        "yearOfPassing",
        "fromDate",
        "toDate",
        "totalMarks",
        "marksObtained",
        "subjectTaken",
        "remarks",
        "grade",
        "courseName",
      ].forEach((f) =>
        formDataToSend.append(
          `education${f.charAt(0).toUpperCase() + f.slice(1)}_${i}`,
          f === "board"
            ? item.board === "Others"
              ? item.otherBoard || ""
              : item.board || ""
            : item[f] || "",
        ),
      );
      formDataToSend.append(
        `educationBoard_${i}`,
        item.board === "Others" ? item.otherBoard || "" : item.board || "",
      );
    });
    professionalFiles.forEach((item, i) => {
      if (item.file) formDataToSend.append(`professionalCert_${i}`, item.file);
      formDataToSend.append(`professionalCertName_${i}`, item.name || "");
      formDataToSend.append(`professionalCompany_${i}`, item.companyName || "");
      formDataToSend.append(`professionalGrade_${i}`, item.grade || "");
      formDataToSend.append(
        `professionalMarksObtained_${i}`,
        item.marksObtained || "",
      );
      formDataToSend.append(
        `professionalTotalMarks_${i}`,
        item.totalMarks || "",
      );
      formDataToSend.append(`professionalValidity_${i}`, item.validity || "");
      formDataToSend.append(`professionalFromDate_${i}`, item.fromDate || "");
      formDataToSend.append(`professionalToDate_${i}`, item.toDate || "");
    });
    experienceEntries.forEach((item, i) => {
      if (item.file) formDataToSend.append(`experienceCert_${i}`, item.file);
      formDataToSend.append(
        `experienceCertName_${i}`,
        item.fileName || `Experience Certificate ${i + 1}`,
      );
      formDataToSend.append(`experienceCompany_${i}`, item.companyName || "");
      formDataToSend.append(
        `experienceDesignation_${i}`,
        item.designation || "",
      );
      formDataToSend.append(
        `experienceReportingName_${i}`,
        item.reportingName || "",
      );
      formDataToSend.append(
        `experienceReportingDesignation_${i}`,
        item.reportingDesignation || "",
      );
      formDataToSend.append(`experienceCtc_${i}`, item.ctc || "");
      formDataToSend.append(`experienceRemarks_${i}`, item.remarks || "");
      formDataToSend.append(`experienceFromDate_${i}`, item.fromDate || "");
      formDataToSend.append(`experienceToDate_${i}`, item.toDate || "");
    });

    try {
      const response = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        body: formDataToSend,
      });
      const result = await response.json();
      if (result.success) {
        alert(
          `✅ Employee Registered Successfully!\n\nDefault Password: ${DEFAULT_PASSWORD}`,
        );
        fetchEmployees();
        setFormData({
          name: "",
          fathersName: "",
          empId: "",
          email: "",
          department: "",
          phone: "",
          emergencyContact: "",
          addressPresent: "",
          addressPermanent: "",
          bloodGroup: "",
          maritalStatus: "",
          jobRole: "",
          extraActivity: "",
        });
        setFamilyData({
          fathersName: "",
          fathersAge: "",
          mothersName: "",
          mothersAge: "",
          spouseName: "",
          spouseAge: "",
          familyAddress: "",
        });
        setSons([]);
        setDaughters([]);
        setLanguages([
          {
            name: "English",
            read: "yes",
            write: "yes",
            speak: "yes",
            removable: false,
          },
          {
            name: "Hindi",
            read: "yes",
            write: "yes",
            speak: "yes",
            removable: true,
          },
        ]);
        setResumeFile(null);
        setFiles({
          photo: null,
          aadhaar: null,
          pan: null,
          voter: null,
          passport: null,
          marriage: null,
          madhyamikAdmit: null,
          cert10: null,
          cert12: null,
          gradCertificate: null,
          masterCertificate: null,
        });
        setEducationEntries([
          {
            examName: "Madhyamik",
            board: "",
            otherBoard: "",
            yearOfPassing: "",
            fromDate: "",
            toDate: "",
            totalMarks: "",
            marksObtained: "",
            subjectTaken: "",
            remarks: "",
            grade: "",
            file: null,
            fileName: "",
            boardType: "board",
          },
        ]);
        setProfessionalFiles([
          {
            name: "",
            file: null,
            companyName: "",
            grade: "",
            marksObtained: "",
            totalMarks: "",
            validity: "",
            fromDate: "",
            toDate: "",
          },
        ]);
        setExperienceEntries([
          {
            companyName: "",
            designation: "",
            fromDate: "",
            toDate: "",
            reportingName: "",
            reportingDesignation: "",
            ctc: "",
            remarks: "",
            file: null,
            fileName: "",
          },
        ]);
        setErrors({});
        setDocErrors({});
        setEducationErrors([]);
      } else {
        alert(
          "❌ " + (result.message || result.error || "Registration failed"),
        );
      }
    } catch (err) {
      alert("❌ Backend is not running or network error!");
    }
  };

  // ════════ LOGIN ════════
  if (authStep === "login") {
    return (
      <Container className="py-4 py-md-5">
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={7} lg={5}>
            <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
              <Card.Header className="bg-primary text-white text-center py-4 py-md-5 border-0 emp-card-header">
                <h2 className="fw-bold mb-1">👋 Welcome Back</h2>
                <p className="opacity-75 mb-0 small">
                  Sign in to access Employee Onboarding
                </p>
              </Card.Header>
              <Card.Body className="p-3 p-md-5 bg-white">
                <Form onSubmit={handleLogin} autoComplete="off">
                  <Form.Group className="mb-3 mb-md-4">
                    <Form.Label className="fw-semibold">Work Email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="name@gmail.com"
                      value={loginEmail}
                      onChange={(e) =>
                        setLoginEmail(e.target.value.replace(/\s+/g, ""))
                      }
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3 mb-md-4">
                    <Form.Label className="fw-semibold">Password</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showLoginPass ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowLoginPass((p) => !p)}
                        tabIndex={-1}
                      >
                        {showLoginPass ? "🙈" : "👁️"}
                      </Button>
                    </InputGroup>
                  </Form.Group>
                  <div className="alert alert-info small py-2 mb-3">
                    🔑 First time? Default password:{" "}
                    <strong>{DEFAULT_PASSWORD}</strong>
                  </div>
                  <div className="d-grid mt-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="rounded-pill fw-bold py-2"
                      disabled={loginLoading}
                    >
                      {loginLoading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Signing in...
                        </>
                      ) : (
                        "🔐 Sign In"
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // ════════ CHANGE PASSWORD ════════
  if (authStep === "change-password") {
    return (
      <Container className="py-4 py-md-5">
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={7} lg={5}>
            <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
              <Card.Header className="bg-warning text-dark text-center py-4 py-md-5 border-0 emp-card-header">
                <h2 className="fw-bold mb-1">🔒 Change Your Password</h2>
                <p className="mb-0 small opacity-75">
                  Set a new password before continuing
                </p>
              </Card.Header>
              <Card.Body className="p-3 p-md-5 bg-white">
                <div className="alert alert-warning small py-2 mb-4">
                  ⚠️ Default password detected. Please set a new password.
                </div>
                <Form onSubmit={handleChangePassword} autoComplete="off">
                  <Form.Group className="mb-3 mb-md-4">
                    <Form.Label className="fw-semibold">
                      New Password
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showNewPass ? "text" : "password"}
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowNewPass((p) => !p)}
                        tabIndex={-1}
                      >
                        {showNewPass ? "🙈" : "👁️"}
                      </Button>
                    </InputGroup>
                  </Form.Group>
                  <Form.Group className="mb-3 mb-md-4">
                    <Form.Label className="fw-semibold">
                      Confirm Password
                    </Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <div className="text-danger small mt-1">
                        ❌ Passwords do not match
                      </div>
                    )}
                    {confirmPassword && newPassword === confirmPassword && (
                      <div className="text-success small mt-1">
                        ✅ Passwords match
                      </div>
                    )}
                  </Form.Group>
                  <div className="d-grid">
                    <Button
                      type="submit"
                      variant="warning"
                      size="lg"
                      className="rounded-pill fw-bold py-2"
                      disabled={changeLoading}
                    >
                      {changeLoading ? "Changing..." : "🔑 Set New Password"}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // ════════ MAIN PAGE ════════
  const isUniversity = (examName) =>
    ["Graduate", "Masters", "Others"].includes(examName);

  return (
    <>
      <Modal show={previewModal.show} onHide={closePreview} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-1">
          <Modal.Title
            className="fw-bold text-primary"
            style={{ fontSize: "15px" }}
          >
            {previewModal.label}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-3 px-4">
          {previewModal.isPdf ? (
            <iframe
              src={previewModal.url}
              title={previewModal.label}
              style={{
                width: "100%",
                height: "70vh",
                border: "none",
                borderRadius: "10px",
              }}
            />
          ) : (
            previewModal.url && (
              <img
                src={previewModal.url}
                alt={previewModal.label}
                className="doc-modal-img"
              />
            )
          )}
          {previewModal.url && (
            <div className="mt-3 d-flex flex-wrap gap-2 justify-content-center">
              <a
                href={previewModal.url}
                download="Employee_Document"
                className="btn-download-pro"
              >
                <span>⬇️</span>
                <span>Download File</span>
              </a>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <Container className="py-4 py-md-5" fluid="lg">
        <Row className="justify-content-center">
          <Col xs={12} lg={11}>
            <Card className="shadow-lg border-0 rounded-4 overflow-hidden mb-4 mb-md-5">
              <Card.Header className="bg-primary text-white text-center py-4 py-md-5 border-0 emp-card-header">
                <h1
                  className="fw-bold mb-0"
                  style={{ fontSize: "clamp(1.3rem,5vw,2rem)" }}
                >
                  🚀 Employee Onboarding
                </h1>
                <p className="opacity-75 mt-2 mb-0 small">
                  Create a professional profile for new employees
                </p>
              </Card.Header>

              <Card.Body className="p-3 p-md-5 bg-white">
                <Form onSubmit={handleSubmit} noValidate>
                  {/* ── Personal Info ── */}
                  <div className="mb-4 mb-md-5">
                    <h5 className="text-primary fw-bold mb-3 mb-md-4">
                      👤 Personal & Account Information
                    </h5>
                    <Row className="g-3 g-md-4">
                      {[
                        {
                          label: "Full Name",
                          name: "name",
                          placeholder: "John Doe",
                        },
                        {
                          label: "Father's Name",
                          name: "fathersName",
                          placeholder: "Father's Full Name",
                        },
                        {
                          label: "Employee ID",
                          name: "empId",
                          placeholder: "EMP2024",
                        },
                      ].map((f) => (
                        <Col key={f.name} xs={12} sm={6} md={4}>
                          <Form.Label className="fw-semibold">
                            {f.label} <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            name={f.name}
                            className={`py-2 ${err(f.name)}`}
                            placeholder={f.placeholder}
                            value={formData[f.name]}
                            onChange={handleChange}
                          />
                          {errors[f.name] && (
                            <div className="invalid-feedback d-block">
                              {errors[f.name]}
                            </div>
                          )}
                        </Col>
                      ))}
                      <Col xs={12} sm={6} md={4}>
                        <Form.Label className="fw-semibold">
                          Work Email <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          className={`py-2 ${err("email")}`}
                          placeholder="name@gmail.com"
                          value={formData.email}
                          onChange={handleChange}
                        />
                        {errors.email && (
                          <div className="invalid-feedback d-block">
                            {errors.email}
                          </div>
                        )}
                        <div className="text-muted small mt-1">
                          Only @gmail.com allowed
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Form.Label className="fw-semibold">
                          Department <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          name="department"
                          className={`py-2 ${err("department")}`}
                          value={formData.department}
                          onChange={handleChange}
                        >
                          <option value="">Select Department</option>
                          {[
                            "Engineering",
                            "IT & Software",
                            "Human Resources",
                            "Finance",
                            "Marketing",
                            "Operations",
                            "Sales",
                          ].map((d) => (
                            <option key={d} value={d.split(" ")[0]}>
                              {d}
                            </option>
                          ))}
                        </Form.Select>
                        {errors.department && (
                          <div className="invalid-feedback d-block">
                            {errors.department}
                          </div>
                        )}
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Form.Label className="fw-semibold">
                          Phone Number <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          name="phone"
                          className={`py-2 ${err("phone")}`}
                          placeholder="10-digit number"
                          value={formData.phone}
                          onChange={handleChange}
                          maxLength={10}
                          inputMode="numeric"
                        />
                        {errors.phone && (
                          <div className="invalid-feedback d-block">
                            {errors.phone}
                          </div>
                        )}
                        <div className="text-muted small mt-1">
                          {formData.phone.length}/10 digits
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Form.Label className="fw-semibold">
                          Emergency Contact{" "}
                          <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          name="emergencyContact"
                          className={`py-2 ${err("emergencyContact")}`}
                          placeholder="10-digit number"
                          value={formData.emergencyContact}
                          onChange={handleChange}
                          maxLength={10}
                          inputMode="numeric"
                        />
                        {errors.emergencyContact && (
                          <div className="invalid-feedback d-block">
                            {errors.emergencyContact}
                          </div>
                        )}
                        <div className="text-muted small mt-1">
                          {formData.emergencyContact.length}/10 digits
                        </div>
                      </Col>
                      <Col xs={6} sm={6} md={4}>
                        <Form.Label className="fw-semibold">
                          Blood Group <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          name="bloodGroup"
                          className={`py-2 ${err("bloodGroup")}`}
                          value={formData.bloodGroup}
                          onChange={handleChange}
                        >
                          <option value="">Choose...</option>
                          {[
                            "A+",
                            "A-",
                            "B+",
                            "B-",
                            "O+",
                            "O-",
                            "AB+",
                            "AB-",
                          ].map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </Form.Select>
                        {errors.bloodGroup && (
                          <div className="invalid-feedback d-block">
                            {errors.bloodGroup}
                          </div>
                        )}
                      </Col>
                      <Col xs={6} sm={6} md={4}>
                        <Form.Label className="fw-semibold">
                          Marital Status <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          name="maritalStatus"
                          className={`py-2 ${err("maritalStatus")}`}
                          value={formData.maritalStatus}
                          onChange={handleChange}
                        >
                          <option value="">Select</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                        </Form.Select>
                        {errors.maritalStatus && (
                          <div className="invalid-feedback d-block">
                            {errors.maritalStatus}
                          </div>
                        )}
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Form.Label className="fw-semibold">
                          Job Role <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          name="jobRole"
                          className={`py-2 ${err("jobRole")}`}
                          placeholder="e.g. Software Engineer"
                          value={formData.jobRole}
                          onChange={handleChange}
                        />
                        {errors.jobRole && (
                          <div className="invalid-feedback d-block">
                            {errors.jobRole}
                          </div>
                        )}
                      </Col>
                      <Col xs={12}>
                        <Form.Label className="fw-semibold">
                          Skills / Extra Activities{" "}
                          <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          name="extraActivity"
                          className={`py-2 ${err("extraActivity")}`}
                          placeholder="Ex: ReactJS, Python, Management"
                          value={formData.extraActivity}
                          onChange={handleChange}
                        />
                        {errors.extraActivity && (
                          <div className="invalid-feedback d-block">
                            {errors.extraActivity}
                          </div>
                        )}
                      </Col>
                    </Row>
                    <div className="alert alert-info small py-2 mt-3 mb-0">
                      🔑 Default password: <strong>{DEFAULT_PASSWORD}</strong> —
                      must change on first login.
                    </div>
                  </div>

                  {/* ── Languages + Resume ── */}
                  <div className="mb-4 mb-md-5 lang-section-wrap">
                    <Row className="g-4">
                      <Col xs={12} md={7}>
                        <h5
                          className="fw-bold mb-1"
                          style={{ color: "#166534" }}
                        >
                          🗣️ Languages Known
                        </h5>
                        <p className="text-muted small mb-3">
                          Add languages with read / write / speak proficiency.
                        </p>
                        {languages.map((lang, idx) => (
                          <div key={idx} className="lang-row-card">
                            <div className="lang-name-tag">🌐 {lang.name}</div>
                            <div className="lang-skill-group">
                              {[
                                { field: "read", label: "Read" },
                                { field: "write", label: "Write" },
                                { field: "speak", label: "Speak" },
                              ].map(({ field, label }) => (
                                <div key={field} className="lang-skill-item">
                                  <span className="lang-skill-label">
                                    {label}
                                  </span>
                                  <select
                                    className={`lang-skill-select ${lang[field]}`}
                                    value={lang[field]}
                                    onChange={(e) =>
                                      updateLanguage(idx, field, e.target.value)
                                    }
                                  >
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                            {lang.removable && (
                              <button
                                type="button"
                                className="remove-lang-btn"
                                onClick={() => removeLanguage(idx)}
                                title="Remove"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          className="add-lang-btn"
                          onClick={addLanguage}
                        >
                          ➕ Add Language
                        </button>
                      </Col>
                      <Col xs={12} md={5}>
                        <h5
                          className="fw-bold mb-1"
                          style={{ color: "#166534" }}
                        >
                          📄 Upload Resume
                        </h5>
                        <p className="text-muted small mb-3">
                          Optional — PDF, DOC, DOCX (max 5 MB)
                        </p>
                        <label
                          className={`resume-upload-box ${resumeFile ? "uploaded" : ""}`}
                        >
                          <span style={{ fontSize: "30px" }}>📤</span>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#166534",
                              textAlign: "center",
                            }}
                          >
                            {resumeFile
                              ? `✔ ${resumeFile.name}`
                              : "Click to Upload Resume"}
                          </span>
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                            PDF / DOC / DOCX
                          </span>
                          <input
                            type="file"
                            style={{ display: "none" }}
                            accept=".pdf,.doc,.docx"
                            onChange={(e) =>
                              setResumeFile(e.target.files[0] || null)
                            }
                          />
                        </label>
                        <div className="mt-2 d-flex align-items-center gap-2 flex-wrap">
                          {resumeFile ? (
                            <>
                              <span className="status-badge-uploaded">
                                ✅ Uploaded
                              </span>
                              {resumeFile.name
                                .toLowerCase()
                                .endsWith(".pdf") && (
                                  <button
                                    type="button"
                                    className="doc-preview-btn"
                                    onClick={() =>
                                      handlePreview({
                                        url: getObjectURL(resumeFile),
                                        label: "📄 Resume",
                                        isPdf: true,
                                      })
                                    }
                                  >
                                    👁️ Preview
                                  </button>
                                )}
                              <button
                                type="button"
                                onClick={() => setResumeFile(null)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#dc3545",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  padding: 0,
                                  fontWeight: 600,
                                }}
                              >
                                ✕ Remove
                              </button>
                            </>
                          ) : (
                            <span className="status-badge-pending">
                              ⏳ Not uploaded (Optional)
                            </span>
                          )}
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* ── Address ── */}
                  <div className="mb-4 mb-md-5">
                    <h5 className="text-primary fw-bold mb-3 mb-md-4">
                      🏠 Address Details
                    </h5>
                    <Row className="g-3 g-md-4">
                      <Col xs={12} md={6}>
                        <Form.Label className="fw-semibold">
                          Present Address <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          name="addressPresent"
                          rows={3}
                          placeholder="House no, Street, City, State, ZIP"
                          className={`py-2 ${err("addressPresent")}`}
                          value={formData.addressPresent}
                          onChange={handleChange}
                        />
                        {errors.addressPresent && (
                          <div className="invalid-feedback d-block">
                            {errors.addressPresent}
                          </div>
                        )}
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Label className="fw-semibold">
                          Permanent Address{" "}
                          <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          name="addressPermanent"
                          rows={3}
                          placeholder="Full permanent address"
                          className={`py-2 ${err("addressPermanent")}`}
                          value={formData.addressPermanent}
                          onChange={handleChange}
                        />
                        {errors.addressPermanent && (
                          <div className="invalid-feedback d-block">
                            {errors.addressPermanent}
                          </div>
                        )}
                      </Col>
                    </Row>
                  </div>

                  {/* ── Family Details ── */}
                  <div className="mb-4 mb-md-5 family-section">
                    <h5 className="fw-bold mb-1" style={{ color: "#6d28d9" }}>
                       Family Details
                    </h5>
                    <p className="text-muted small mb-4">
                      Provide family background information for employee
                      records.
                    </p>
                    <div className="mb-4 p-3 bg-white rounded-3 border shadow-sm">
                      <h6
                        className="fw-bold mb-3"
                        style={{ color: "#6d28d9", fontSize: "13px" }}
                      >
                        Parents Information
                      </h6>
                      <Row className="g-3">
                        <Col xs={12} sm={6} md={4}>
                          <Form.Label className="fw-semibold small">
                            Father's Name
                          </Form.Label>
                          <Form.Control
                            name="fathersName"
                            placeholder="Father's full name"
                            value={familyData.fathersName}
                            onChange={handleFamilyChange}
                            style={{ borderColor: "#e9d5ff" }}
                          />
                        </Col>
                        <Col xs={6} sm={3} md={2}>
                          <Form.Label className="fw-semibold small">
                            Father's Age
                          </Form.Label>
                          <Form.Control
                            name="fathersAge"
                            placeholder="Age"
                            value={familyData.fathersAge}
                            onChange={handleFamilyChange}
                            inputMode="numeric"
                            maxLength={3}
                            style={{ borderColor: "#e9d5ff" }}
                          />
                        </Col>
                        <Col xs={12} sm={6} md={4}>
                          <Form.Label className="fw-semibold small">
                            Mother's Name
                          </Form.Label>
                          <Form.Control
                            name="mothersName"
                            placeholder="Mother's full name"
                            value={familyData.mothersName}
                            onChange={handleFamilyChange}
                            style={{ borderColor: "#e9d5ff" }}
                          />
                        </Col>
                        <Col xs={6} sm={3} md={2}>
                          <Form.Label className="fw-semibold small">
                            Mother's Age
                          </Form.Label>
                          <Form.Control
                            name="mothersAge"
                            placeholder="Age"
                            value={familyData.mothersAge}
                            onChange={handleFamilyChange}
                            inputMode="numeric"
                            maxLength={3}
                            style={{ borderColor: "#e9d5ff" }}
                          />
                        </Col>
                      </Row>
                    </div>
                    <div className="mb-4 p-3 bg-white rounded-3 border shadow-sm">
                      <h6
                        className="fw-bold mb-3"
                        style={{ color: "#6d28d9", fontSize: "13px" }}
                      >
                        Spouse Information
                      </h6>
                      <Row className="g-3">
                        <Col xs={12} sm={6} md={5}>
                          <Form.Label className="fw-semibold small">
                            Spouse Name
                          </Form.Label>
                          <Form.Control
                            name="spouseName"
                            placeholder="Enter husband / wife name"
                            value={familyData.spouseName}
                            onChange={handleFamilyChange}
                            style={{ borderColor: "#e9d5ff" }}
                          />
                        </Col>
                        <Col xs={6} sm={3} md={2}>
                          <Form.Label className="fw-semibold small">
                            Spouse Age
                          </Form.Label>
                          <Form.Control
                            name="spouseAge"
                            placeholder="Age"
                            value={familyData.spouseAge}
                            onChange={handleFamilyChange}
                            inputMode="numeric"
                            maxLength={3}
                            style={{ borderColor: "#e9d5ff" }}
                          />
                        </Col>
                      </Row>
                    </div>

                    {/* Children */}
                    <div className="mb-4 p-3 bg-white rounded-3 border shadow-sm">
                      <div
                        onClick={() => setShowChildren((p) => !p)}
                        style={{
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <h6
                          className="fw-bold mb-0"
                          style={{ color: "#6d28d9", fontSize: "14px" }}
                        >
                          👨‍👩‍👧‍👦 Children {showChildren ? "▲" : "▼"}
                        </h6>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                          Total: {sons.length + daughters.length}
                        </span>
                      </div>
                      {showChildren && (
                        <div
                          className="mt-3"
                          style={{
                            border: "1px solid #e9d5ff",
                            borderRadius: "12px",
                            overflow: "hidden",
                          }}
                        >
                          <div style={{ borderBottom: "1px solid #e9d5ff" }}>
                            <div
                              onClick={() => {
                                setShowSons((p) => !p);
                                setShowDaughters(false);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 14px",
                                background: "#eff6ff",
                                cursor: "pointer",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#1e40af",
                                }}
                              >
                                Sons {showSons ? "−" : "+"}{" "}
                                <span
                                  style={{
                                    marginLeft: "8px",
                                    fontSize: "11px",
                                    padding: "2px 10px",
                                    borderRadius: "20px",
                                    background: "#dbeafe",
                                    color: "#1e40af",
                                  }}
                                >
                                  {sons.length}
                                </span>
                              </span>
                              <button
                                type="button"
                                className="add-child-btn-son"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addSon();
                                  setShowSons(true);
                                  setShowDaughters(false);
                                }}
                              >
                                + Add Son
                              </button>
                            </div>
                            {showSons && (
                              <div
                                style={{
                                  padding: "8px 12px",
                                  background: "#f8faff",
                                }}
                              >
                                {sons.length === 0 ? (
                                  <div
                                    style={{
                                      padding: "10px",
                                      textAlign: "center",
                                      fontSize: "12px",
                                      color: "#9ca3af",
                                    }}
                                  >
                                    No sons added
                                  </div>
                                ) : (
                                  <>
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                          "1fr 60px 110px 28px",
                                        gap: "6px",
                                        marginBottom: "4px",
                                      }}
                                    >
                                      {["Name", "Age", "DOB", ""].map(
                                        (h, i) => (
                                          <span
                                            key={i}
                                            style={{
                                              fontSize: "10px",
                                              color: "#6b7280",
                                              textTransform: "uppercase",
                                            }}
                                          >
                                            {h}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                    {sons.map((son, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "1fr 60px 110px 28px",
                                          gap: "6px",
                                          marginBottom: "6px",
                                        }}
                                      >
                                        <Form.Control
                                          size="sm"
                                          placeholder="Name"
                                          value={son.name}
                                          onChange={(e) =>
                                            updateSon(
                                              idx,
                                              "name",
                                              e.target.value,
                                            )
                                          }
                                        />
                                        <Form.Control
                                          size="sm"
                                          placeholder="Age"
                                          value={son.age}
                                          onChange={(e) =>
                                            updateSon(
                                              idx,
                                              "age",
                                              e.target.value,
                                            )
                                          }
                                        />
                                        <Form.Control
                                          size="sm"
                                          type="date"
                                          value={son.dob || ""}
                                          onChange={(e) =>
                                            updateSon(
                                              idx,
                                              "dob",
                                              e.target.value,
                                            )
                                          }
                                        />
                                        <button
                                          type="button"
                                          className="remove-child-btn"
                                          onClick={() => removeSon(idx)}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <div
                              onClick={() => {
                                setShowDaughters((p) => !p);
                                setShowSons(false);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 14px",
                                background: "#fff0f8",
                                cursor: "pointer",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#9d174d",
                                }}
                              >
                                Daughters {showDaughters ? "−" : "+"}{" "}
                                <span
                                  style={{
                                    marginLeft: "8px",
                                    fontSize: "11px",
                                    padding: "2px 10px",
                                    borderRadius: "20px",
                                    background: "#fce7f3",
                                    color: "#9d174d",
                                  }}
                                >
                                  {daughters.length}
                                </span>
                              </span>
                              <button
                                type="button"
                                className="add-child-btn-daughter"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addDaughter();
                                  setShowDaughters(true);
                                  setShowSons(false);
                                }}
                              >
                                + Add Daughter
                              </button>
                            </div>
                            {showDaughters && (
                              <div
                                style={{
                                  padding: "8px 12px",
                                  background: "#fffbff",
                                }}
                              >
                                {daughters.length === 0 ? (
                                  <div
                                    style={{
                                      padding: "10px",
                                      textAlign: "center",
                                      fontSize: "12px",
                                      color: "#9ca3af",
                                    }}
                                  >
                                    No daughters added
                                  </div>
                                ) : (
                                  <>
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                          "1fr 60px 110px 28px",
                                        gap: "6px",
                                        marginBottom: "4px",
                                      }}
                                    >
                                      {["Name", "Age", "DOB", ""].map(
                                        (h, i) => (
                                          <span
                                            key={i}
                                            style={{
                                              fontSize: "10px",
                                              color: "#6b7280",
                                              textTransform: "uppercase",
                                            }}
                                          >
                                            {h}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                    {daughters.map((daughter, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "1fr 60px 110px 28px",
                                          gap: "6px",
                                          marginBottom: "6px",
                                        }}
                                      >
                                        <Form.Control
                                          size="sm"
                                          placeholder="Name"
                                          value={daughter.name}
                                          onChange={(e) =>
                                            updateDaughter(
                                              idx,
                                              "name",
                                              e.target.value,
                                            )
                                          }
                                        />
                                        <Form.Control
                                          size="sm"
                                          placeholder="Age"
                                          value={daughter.age}
                                          onChange={(e) =>
                                            updateDaughter(
                                              idx,
                                              "age",
                                              e.target.value,
                                            )
                                          }
                                        />
                                        <Form.Control
                                          size="sm"
                                          type="date"
                                          value={daughter.dob || ""}
                                          onChange={(e) =>
                                            updateDaughter(
                                              idx,
                                              "dob",
                                              e.target.value,
                                            )
                                          }
                                        />
                                        <button
                                          type="button"
                                          className="remove-child-btn"
                                          onClick={() => removeDaughter(idx)}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div
                        className="family-summary-bar"
                        style={{
                          marginTop: "10px",
                          fontSize: "12px",
                          display: "flex",
                          gap: "15px",
                        }}
                      >
                        <span>Sons: {sons.length}</span>
                        <span>Daughters: {daughters.length}</span>
                        <span style={{ fontWeight: "bold" }}>
                          Total: {sons.length + daughters.length}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-3 border shadow-sm">
                      <h6
                        className="fw-bold mb-3"
                        style={{ color: "#6d28d9", fontSize: "13px" }}
                      >
                        Family Address
                      </h6>
                      <Form.Control
                        as="textarea"
                        name="familyAddress"
                        rows={3}
                        placeholder="Family residence address"
                        value={familyData.familyAddress}
                        onChange={handleFamilyChange}
                        style={{ borderColor: "#e9d5ff" }}
                      />
                    </div>
                    <div className="family-summary-bar">
                      <span className="family-stat">
                        Father: {familyData.fathersName || "—"} | Age:{" "}
                        {familyData.fathersAge || "—"}
                      </span>
                      <span className="family-stat">
                        Mother: {familyData.mothersName || "—"}
                      </span>
                      <span className="family-stat">
                        Spouse: {familyData.spouseName || "—"}
                      </span>
                      <span className="family-stat">
                        Sons: {sons.length} | Daughters: {daughters.length}
                      </span>
                    </div>
                  </div>

                  {/* ── Education ── */}
                  <div
                    className="mb-4 mb-md-5 p-3 p-md-4 rounded-4 border"
                    id="edu-section"
                    style={{
                      background:
                        "linear-gradient(135deg,rgba(240,253,244,.8),rgba(220,252,231,.8))",
                      backdropFilter: "blur(10px)",
                      boxShadow: "0 8px 32px rgba(0,0,0,.08)",
                    }}
                  >
                    <h5 className="fw-bold mb-1" style={{ color: "#166534" }}>
                      🎓 Educational Qualification
                    </h5>
                    <p className="text-muted small mb-4">
                      Add all educational qualifications.{" "}
                      <span className="text-danger fw-bold">*</span> fields are
                      required.
                    </p>

                    {educationErrors.some(
                      (e) => e && Object.keys(e).length > 0,
                    ) && (
                        <div
                          className="alert alert-danger py-2 px-3 mb-3 rounded-3"
                          style={{ fontSize: "13px" }}
                        >
                          <strong>
                            ❗ Please fix education errors before submitting.
                          </strong>
                          <ul className="mb-0 mt-1 ps-3">
                            {educationErrors.map((e, i) =>
                              e && Object.keys(e).length > 0 ? (
                                <li key={i}>
                                  Qualification #{i + 1}:{" "}
                                  {Object.values(e).filter(Boolean)[0]}
                                </li>
                              ) : null,
                            )}
                          </ul>
                        </div>
                      )}

                    <div className="d-flex flex-column gap-3">
                      {educationEntries.map((entry, idx) => {
                        const pct =
                          entry.marksObtained &&
                            entry.totalMarks &&
                            !isNaN(entry.marksObtained) &&
                            !isNaN(entry.totalMarks) &&
                            parseFloat(entry.totalMarks) > 0 &&
                            parseFloat(entry.marksObtained) <=
                            parseFloat(entry.totalMarks)
                            ? (
                              (parseFloat(entry.marksObtained) /
                                parseFloat(entry.totalMarks)) *
                              100
                            ).toFixed(1)
                            : null;
                        const hasEntryError =
                          educationErrors[idx] &&
                          Object.keys(educationErrors[idx]).length > 0;
                        const univMode = isUniversity(entry.examName);

                        return (
                          <div
                            key={idx}
                            style={{
                              background: "#fff",
                              border: `2px solid ${hasEntryError ? "#f87171" : "#86efac"}`,
                              borderRadius: "14px",
                              padding: "18px 20px",
                              boxShadow: "0 2px 8px rgba(22,101,52,.07)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "14px",
                                paddingBottom: "10px",
                                borderBottom: "1.5px dashed #86efac",
                              }}
                            >
                              <span
                                style={{
                                  background: hasEntryError
                                    ? "#fee2e2"
                                    : "linear-gradient(135deg,#dcfce7,#bbf7d0)",
                                  color: hasEntryError ? "#dc3545" : "#166534",
                                  border: `1.5px solid ${hasEntryError ? "#fca5a5" : "#86efac"}`,
                                  borderRadius: "50px",
                                  padding: "4px 14px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                }}
                              >
                                🎓{" "}
                                {entry.examName || `Qualification #${idx + 1}`}
                                {hasEntryError && (
                                  <span className="ms-2">⚠️ Incomplete</span>
                                )}
                              </span>
                              {educationEntries.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeEducationEntry(idx)}
                                  style={{
                                    background: "#fee2e2",
                                    border: "1.5px solid #fca5a5",
                                    color: "#dc3545",
                                    borderRadius: "50%",
                                    width: "28px",
                                    height: "28px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "15px",
                                    cursor: "pointer",
                                  }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            <Row className="g-3">
                              <Col xs={12} sm={6} md={4}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#166534",
                                    textTransform: "uppercase",
                                    marginBottom: "4px",
                                  }}
                                >
                                  📋 Name of Examination{" "}
                                  <span className="text-danger">*</span>
                                </div>
                                <Form.Select
                                  value={entry.examName}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "examName",
                                      e.target.value,
                                    )
                                  }
                                  className={
                                    eduErr(idx, "examName") ? "is-invalid" : ""
                                  }
                                  style={{
                                    border: `1.5px solid ${eduErr(idx, "examName") ? "#dc3545" : "#86efac"}`,
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                  }}
                                >
                                  <option value="">Select Examination</option>
                                  {examOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </Form.Select>
                                {eduErr(idx, "examName") && (
                                  <div className="invalid-feedback d-block">
                                    ❗ {eduErr(idx, "examName")}
                                  </div>
                                )}
                              </Col>

                              <Col xs={12} sm={6} md={4}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#166534",
                                    textTransform: "uppercase",
                                    marginBottom: "4px",
                                  }}
                                >
                                  🏛️{" "}
                                  {univMode
                                    ? "University or Colleges"
                                    : "Board"}{" "}
                                  <span className="text-danger">*</span>
                                </div>
                                {univMode && (
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "6px",
                                      marginBottom: "8px",
                                    }}
                                  >
                                    {[
                                      { key: "college", label: "🏫 College" },
                                      {
                                        key: "university",
                                        label: "🏛️ University",
                                      },
                                    ].map((tab) => (
                                      <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => {
                                          updateEducationEntry(
                                            idx,
                                            "boardType",
                                            tab.key,
                                          );
                                          updateEducationEntry(
                                            idx,
                                            "board",
                                            "",
                                          );
                                          updateEducationEntry(
                                            idx,
                                            "otherBoard",
                                            "",
                                          );
                                        }}
                                        style={{
                                          padding: "5px 14px",
                                          borderRadius: "50px",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          cursor: "pointer",
                                          border: "2px solid",
                                          background:
                                            entry.boardType === tab.key
                                              ? "linear-gradient(135deg,#1d4ed8,#3b82f6)"
                                              : "#f0f9ff",
                                          color:
                                            entry.boardType === tab.key
                                              ? "#fff"
                                              : "#1d4ed8",
                                          borderColor:
                                            entry.boardType === tab.key
                                              ? "#1d4ed8"
                                              : "#93c5fd",
                                        }}
                                      >
                                        {tab.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <Form.Select
                                  value={entry.board}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "board",
                                      e.target.value,
                                    )
                                  }
                                  className={
                                    eduErr(idx, "board") ? "is-invalid" : ""
                                  }
                                  style={{
                                    border: `1.5px solid ${eduErr(idx, "board") ? "#dc3545" : univMode ? "#93c5fd" : "#86efac"}`,
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                  }}
                                >
                                  <option value="">
                                    {univMode
                                      ? entry.boardType === "university"
                                        ? "Select University"
                                        : "Select College"
                                      : "Select Board"}
                                  </option>
                                  {!univMode &&
                                    boardOnlyOptions.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  {univMode &&
                                    entry.boardType === "college" && (
                                      <>
                                        <optgroup label="📍 Kolkata Colleges">
                                          {[
                                            "Presidency College, Kolkata",
                                            "St. Xavier's College, Kolkata",
                                            "Scottish Church College",
                                            "Bethune College",
                                            "Lady Brabourne College",
                                            "Maulana Azad College",
                                            "Asutosh College",
                                            "Surendranath College",
                                            "City College, Kolkata",
                                            "Heramba Chandra College",
                                            "Goenka College of Commerce and Business Administration",
                                            "Acharya Jagadish Chandra Bose College",
                                            "Bangabasi College",
                                            "South City College",
                                            "The Bhawanipur Education Society College",
                                            "Vidyasagar College",
                                            "Dinabandhu Andrews College",
                                          ].map((c) => (
                                            <option key={c} value={c}>
                                              {c}
                                            </option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="🏥 Medical Colleges">
                                          {[
                                            "Calcutta Medical College",
                                            "R.G. Kar Medical College",
                                            "NRS Medical College",
                                            "SSKM Medical College",
                                            "KPC Medical College",
                                          ].map((c) => (
                                            <option key={c} value={c}>
                                              {c}
                                            </option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="⚙️ Engineering Colleges">
                                          {[
                                            "Heritage Institute of Technology",
                                            "Techno India",
                                            "JIS College of Engineering",
                                            "Narula Institute of Technology",
                                            "Future Institute of Engineering and Management",
                                            "Meghnad Saha Institute of Technology",
                                            "Budge Budge Institute of Technology",
                                          ].map((c) => (
                                            <option key={c} value={c}>
                                              {c}
                                            </option>
                                          ))}
                                        </optgroup>
                                        <option value="Others">
                                          Others (Specify)
                                        </option>
                                      </>
                                    )}
                                  {univMode &&
                                    entry.boardType === "university" && (
                                      <>
                                        <optgroup label="🏛️ West Bengal Universities">
                                          {[
                                            "University of Calcutta",
                                            "Jadavpur University",
                                            "Presidency University, Kolkata",
                                            "Rabindra Bharati University",
                                            "University of Kalyani",
                                            "Burdwan University",
                                            "North Bengal University",
                                            "Vidyasagar University",
                                            "West Bengal State University",
                                            "Maulana Abul Kalam Azad University of Technology (MAKAUT)",
                                          ].map((u) => (
                                            <option key={u} value={u}>
                                              {u}
                                            </option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="🏛️ National Universities">
                                          {[
                                            "University of Delhi",
                                            "Jawaharlal Nehru University (JNU)",
                                            "University of Mumbai",
                                            "Bangalore University",
                                            "Anna University",
                                            "Banaras Hindu University (BHU)",
                                            "Gauhati University",
                                            "Ranchi University",
                                          ].map((u) => (
                                            <option key={u} value={u}>
                                              {u}
                                            </option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="🔬 IITs / IIMs">
                                          {[
                                            "IIT Kharagpur",
                                            "IIT Bombay",
                                            "IIT Delhi",
                                            "IIT Madras",
                                            "IIT Kanpur",
                                            "IIM Calcutta",
                                            "IIM Ahmedabad",
                                            "AIIMS Delhi",
                                          ].map((u) => (
                                            <option key={u} value={u}>
                                              {u}
                                            </option>
                                          ))}
                                        </optgroup>
                                        <option value="Others">
                                          Others (Specify)
                                        </option>
                                      </>
                                    )}
                                </Form.Select>
                                {univMode &&
                                  entry.boardType === "college" &&
                                  entry.board &&
                                  entry.board !== "Others" &&
                                  entry.autoUniversity && (
                                    <div
                                      style={{
                                        marginTop: "8px",
                                        padding: "8px 14px",
                                        background:
                                          "linear-gradient(135deg,#eff6ff,#dbeafe)",
                                        border: "1.5px solid #93c5fd",
                                        borderRadius: "10px",
                                        fontSize: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      🏛️{" "}
                                      <span style={{ color: "#64748b" }}>
                                        Affiliated to:
                                      </span>{" "}
                                      <strong style={{ color: "#1e40af" }}>
                                        {entry.autoUniversity}
                                      </strong>
                                    </div>
                                  )}
                                {univMode &&
                                  entry.boardType === "university" &&
                                  entry.board &&
                                  entry.board !== "Others" && (
                                    <div style={{ marginTop: "8px" }}>
                                      {entry.examName !== "Masters" && (
                                        <Form.Control
                                          type="text"
                                          placeholder="🏫 Enter your College Name..."
                                          value={entry.collegeName || ""}
                                          onChange={(e) =>
                                            updateEducationEntry(
                                              idx,
                                              "collegeName",
                                              e.target.value,
                                            )
                                          }
                                          style={{
                                            border: "1.5px solid #93c5fd",
                                            borderRadius: "8px",
                                            fontSize: "13px",
                                            marginBottom: "8px",
                                          }}
                                        />
                                      )}
                                      <div
                                        style={{
                                          padding: "10px 14px",
                                          background:
                                            "linear-gradient(135deg,#eff6ff,#dbeafe)",
                                          border: "1.5px solid #93c5fd",
                                          borderRadius: "10px",
                                          fontSize: "12px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                          }}
                                        >
                                          🏛️{" "}
                                          <span style={{ color: "#64748b" }}>
                                            University:
                                          </span>{" "}
                                          <strong style={{ color: "#1e40af" }}>
                                            {entry.board}
                                          </strong>
                                        </div>
                                        {entry.examName !== "Masters" &&
                                          entry.collegeName && (
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                marginTop: "4px",
                                              }}
                                            >
                                              🏫{" "}
                                              <span
                                                style={{ color: "#64748b" }}
                                              >
                                                College:
                                              </span>{" "}
                                              <strong
                                                style={{ color: "#1e40af" }}
                                              >
                                                {entry.collegeName}
                                              </strong>
                                            </div>
                                          )}
                                      </div>
                                    </div>
                                  )}
                                {entry.board === "Others" && (
                                  <Form.Control
                                    className={`mt-2 ${eduErr(idx, "otherBoard") ? "is-invalid" : ""}`}
                                    placeholder={
                                      univMode
                                        ? entry.boardType === "university"
                                          ? "Enter University Name..."
                                          : "Enter College Name..."
                                        : "Enter Board Name..."
                                    }
                                    value={entry.otherBoard || ""}
                                    onChange={(e) =>
                                      updateEducationEntry(
                                        idx,
                                        "otherBoard",
                                        e.target.value,
                                      )
                                    }
                                    style={{
                                      border: `1.5px solid ${eduErr(idx, "otherBoard") ? "#dc3545" : "#86efac"}`,
                                      borderRadius: "8px",
                                      fontSize: "13px",
                                    }}
                                  />
                                )}
                                {eduErr(idx, "board") && (
                                  <div className="invalid-feedback d-block">
                                    ❗ {eduErr(idx, "board")}
                                  </div>
                                )}
                              </Col>

                              <Col xs={6} sm={4} md={2}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#166534",
                                    textTransform: "uppercase",
                                    marginBottom: "4px",
                                  }}
                                >
                                  📅 Year of Passing{" "}
                                  <span className="text-danger">*</span>
                                </div>
                                <Form.Control
                                  placeholder="e.g. 2022"
                                  value={entry.yearOfPassing}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "yearOfPassing",
                                      e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 4),
                                    )
                                  }
                                  inputMode="numeric"
                                  maxLength={4}
                                  className={
                                    eduErr(idx, "yearOfPassing")
                                      ? "is-invalid"
                                      : ""
                                  }
                                  style={{
                                    border: `1.5px solid ${eduErr(idx, "yearOfPassing") ? "#dc3545" : "#86efac"}`,
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                  }}
                                />
                                {eduErr(idx, "yearOfPassing") && (
                                  <div className="invalid-feedback d-block">
                                    ❗ {eduErr(idx, "yearOfPassing")}
                                  </div>
                                )}
                              </Col>

                              <Col xs={12} sm={6} md={3}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#166534",
                                    textTransform: "uppercase",
                                    marginBottom: "4px",
                                  }}
                                >
                                  📅 From Date
                                </div>
                                <Form.Control
                                  type="date"
                                  value={entry.fromDate}
                                  max={entry.toDate || undefined}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "fromDate",
                                      e.target.value,
                                    )
                                  }
                                  className={
                                    eduErr(idx, "fromDate") ? "is-invalid" : ""
                                  }
                                  style={{
                                    border: `1.5px solid ${eduErr(idx, "fromDate") ? "#dc3545" : "#86efac"}`,
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                  }}
                                />
                                {eduErr(idx, "fromDate") && (
                                  <div className="invalid-feedback d-block">
                                    ❗ {eduErr(idx, "fromDate")}
                                  </div>
                                )}
                              </Col>

                              <Col xs={12} sm={6} md={3}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#166534",
                                    textTransform: "uppercase",
                                    marginBottom: "4px",
                                  }}
                                >
                                  📅 To Date
                                </div>
                                <Form.Control
                                  type="date"
                                  value={entry.toDate}
                                  min={entry.fromDate || undefined}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "toDate",
                                      e.target.value,
                                    )
                                  }
                                  className={
                                    eduErr(idx, "toDate") ? "is-invalid" : ""
                                  }
                                  style={{
                                    border: `1.5px solid ${eduErr(idx, "toDate") ? "#dc3545" : "#86efac"}`,
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                  }}
                                />
                                {eduErr(idx, "toDate") && (
                                  <div className="invalid-feedback d-block">
                                    ❗ {eduErr(idx, "toDate")}
                                  </div>
                                )}
                              </Col>

                              <Col xs={6} sm={4} md={2}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#166534",
                                    textTransform: "uppercase",
                                    marginBottom: "4px",
                                  }}
                                >
                                  📊 Total Marks{" "}
                                  <span className="text-danger">*</span>
                                </div>
                                <Form.Control
                                  placeholder="e.g. 500"
                                  value={entry.totalMarks}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "totalMarks",
                                      e.target.value,
                                    )
                                  }
                                  inputMode="numeric"
                                  className={
                                    eduErr(idx, "totalMarks")
                                      ? "is-invalid"
                                      : ""
                                  }
                                  style={{
                                    border: `1.5px solid ${eduErr(idx, "totalMarks") ? "#dc3545" : "#86efac"}`,
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                  }}
                                />
                                {eduErr(idx, "totalMarks") && (
                                  <div className="invalid-feedback d-block">
                                    ❗ {eduErr(idx, "totalMarks")}
                                  </div>
                                )}
                              </Col>

                              <Col xs={6} sm={4} md={2}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#166534",
                                    textTransform: "uppercase",
                                    marginBottom: "4px",
                                  }}
                                >
                                  ✅ Marks Obtained{" "}
                                  <span className="text-danger">*</span>
                                </div>
                                <Form.Control
                                  placeholder="e.g. 430"
                                  value={entry.marksObtained}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "marksObtained",
                                      e.target.value,
                                    )
                                  }
                                  inputMode="numeric"
                                  className={
                                    eduErr(idx, "marksObtained")
                                      ? "is-invalid"
                                      : ""
                                  }
                                  style={{
                                    border: `1.5px solid ${eduErr(idx, "marksObtained") ? "#dc3545" : "#86efac"}`,
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                  }}
                                />
                                {eduErr(idx, "marksObtained") && (
                                  <div className="invalid-feedback d-block">
                                    ❗ {eduErr(idx, "marksObtained")}
                                  </div>
                                )}
                              </Col>

                              {pct && (
                                <Col
                                  xs={6}
                                  sm={4}
                                  md={2}
                                  className="d-flex align-items-end"
                                >
                                  <span
                                    style={{
                                      background: "#dcfce7",
                                      color: "#166534",
                                      border: "1px solid #86efac",
                                      borderRadius: "50px",
                                      padding: "4px 12px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                    }}
                                  >
                                    📈 {pct}%
                                  </span>
                                </Col>
                              )}

                              <Col xs={12} sm={6} md={4}>
                                <div className="edu-field-label">
                                  📚 Subject Taken{" "}
                                  <span style={{ color: "#ef4444" }}>*</span>
                                </div>
                                <Form.Control
                                  placeholder="e.g. Mathematics, Science, Commerce"
                                  value={entry.subjectTaken || ""}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "subjectTaken",
                                      e.target.value,
                                    )
                                  }
                                  className={
                                    eduErr(idx, "subjectTaken")
                                      ? "is-invalid"
                                      : ""
                                  }
                                  style={{
                                    border: `1.5px solid ${eduErr(idx, "subjectTaken") ? "#dc3545" : "#86efac"}`,
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                  }}
                                />
                                {eduErr(idx, "subjectTaken") && (
                                  <div className="invalid-feedback d-block">
                                    ❗ {eduErr(idx, "subjectTaken")}
                                  </div>
                                )}
                              </Col>

                              {["Graduate", "Masters"].includes(
                                entry.examName,
                              ) && (
                                  <Col xs={12} sm={6} md={4}>
                                    <div className="edu-field-label">
                                      🎓 Course Name{" "}
                                      <span className="text-danger">*</span>
                                    </div>
                                    <Form.Control
                                      placeholder="e.g. B.Tech, MBA, M.Sc"
                                      value={entry.courseName || ""}
                                      onChange={(e) =>
                                        updateEducationEntry(
                                          idx,
                                          "courseName",
                                          e.target.value,
                                        )
                                      }
                                      className={
                                        eduErr(idx, "courseName")
                                          ? "is-invalid"
                                          : ""
                                      }
                                      style={{
                                        border: `1.5px solid ${eduErr(idx, "courseName") ? "#dc3545" : "#86efac"}`,
                                        borderRadius: "8px",
                                        fontSize: "13px",
                                      }}
                                    />
                                    {eduErr(idx, "courseName") && (
                                      <div className="invalid-feedback d-block">
                                        ❗ {eduErr(idx, "courseName")}
                                      </div>
                                    )}
                                  </Col>
                                )}

                              <Col xs={12} sm={6} md={4}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#166534",
                                    textTransform: "uppercase",
                                    marginBottom: "4px",
                                  }}
                                >
                                  🏆 Grade{" "}
                                  <span className="text-danger">*</span>
                                </div>
                                <Form.Control
                                  placeholder="e.g. A+"
                                  value={entry.grade || ""}
                                  onChange={(e) =>
                                    updateEducationEntry(
                                      idx,
                                      "grade",
                                      e.target.value,
                                    )
                                  }
                                  className={
                                    eduErr(idx, "grade") ? "is-invalid" : ""
                                  }
                                  style={{
                                    border: `1.5px solid ${eduErr(idx, "grade") ? "#dc3545" : "#86efac"}`,
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                  }}
                                />
                                {eduErr(idx, "grade") && (
                                  <div className="invalid-feedback d-block">
                                    ❗ {eduErr(idx, "grade")}
                                  </div>
                                )}
                              </Col>

                              <Col xs={12}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#166534",
                                    textTransform: "uppercase",
                                    marginBottom: "4px",
                                  }}
                                >
                                  📎 Certificate Upload
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <label
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      padding: "5px 14px",
                                      borderRadius: "50px",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      background:
                                        "linear-gradient(135deg,#dcfce7,#bbf7d0)",
                                      color: "#166534",
                                      border: "1.5px solid #86efac",
                                      cursor: "pointer",
                                    }}
                                  >
                                    ⬆️ Upload
                                    <input
                                      type="file"
                                      style={{ display: "none" }}
                                      accept=".jpg,.jpeg,.png,.pdf"
                                      onChange={(e) =>
                                        handleEducationFileChange(
                                          idx,
                                          e.target.files[0],
                                        )
                                      }
                                    />
                                  </label>
                                  {entry.file ? (
                                    <>
                                      <div
                                        style={{
                                          fontSize: "10px",
                                          color: "#166534",
                                          wordBreak: "break-all",
                                          maxWidth: "160px",
                                        }}
                                      >
                                        ✔ {entry.file.name}
                                      </div>
                                      <button
                                        type="button"
                                        className="doc-preview-btn"
                                        onClick={() =>
                                          handlePreview({
                                            url: getObjectURL(entry.file),
                                            isPdf: entry.file.name
                                              .toLowerCase()
                                              .endsWith(".pdf"),
                                            label: entry.examName
                                              ? `🎓 ${entry.examName}`
                                              : `Certificate #${idx + 1}`,
                                          })
                                        }
                                      >
                                        👁️ View
                                      </button>
                                      <span className="status-badge-uploaded">
                                        OK
                                      </span>
                                    </>
                                  ) : (
                                    <span className="status-badge-pending">
                                      ⏳ Not Uploaded (Optional)
                                    </span>
                                  )}
                                </div>
                              </Col>
                            </Row>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ textAlign: "center", marginTop: "16px" }}>
                      <button
                        type="button"
                        onClick={addEducationEntry}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 24px",
                          borderRadius: "50px",
                          fontSize: "13px",
                          fontWeight: 700,
                          background: "linear-gradient(135deg,#dcfce7,#bbf7d0)",
                          color: "#166534",
                          border: "2px solid #86efac",
                          cursor: "pointer",
                        }}
                      >
                        ➕ Add Another Qualification
                      </button>
                    </div>
                  </div>

                  {/* ── Professional Education ── */}
                  <div className="mb-4 mb-md-5">
                    <h5 className="fw-bold mb-1" style={{ color: "#0e7490" }}>
                      🏅 Professional Education
                    </h5>
                    <p className="text-muted small mb-4">
                      Add professional degrees and certificates.
                    </p>
                    <div className="prof-section-wrap">
                      {professionalFiles.map((item, idx) => {
                        const duration = calcDuration(
                          item.fromDate,
                          item.toDate,
                        );
                        const pct =
                          item.marksObtained && item.totalMarks
                            ? (
                              (parseFloat(item.marksObtained) /
                                parseFloat(item.totalMarks)) *
                              100
                            ).toFixed(1)
                            : null;
                        return (
                          <div key={idx} className="prof-entry-card">
                            <div className="prof-entry-header">
                              <span className="prof-entry-badge">
                                🎓 Entry #{idx + 1}
                                {item.companyName && (
                                  <span
                                    style={{ fontWeight: 400, opacity: 0.8 }}
                                  >
                                    {" "}
                                    — {item.companyName}
                                  </span>
                                )}
                              </span>
                              {professionalFiles.length > 1 && (
                                <button
                                  type="button"
                                  className="remove-prof-btn"
                                  onClick={() => removeProfessionalField(idx)}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <Row className="g-3">
                              <Col xs={12} sm={6} md={4}>
                                <div className="prof-field-label">
                                  🎓 Degree / Certificate Name
                                </div>
                                <Form.Control
                                  className="prof-input"
                                  placeholder="e.g. B.Tech, MBA, AWS Certified..."
                                  value={item.name || ""}
                                  onChange={(e) =>
                                    handleProfessionalNameChange(e, idx)
                                  }
                                />
                              </Col>
                              <Col xs={12} sm={6} md={4}>
                                <div className="prof-field-label">
                                  🏛️ University / College / Company
                                </div>
                                <Form.Control
                                  className="prof-input"
                                  placeholder="e.g. Calcutta University / Coursera"
                                  value={item.companyName}
                                  onChange={(e) =>
                                    handleProfessionalFieldChange(
                                      idx,
                                      "companyName",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Col>
                              <Col xs={12} sm={6} md={4}>
                                <div className="prof-field-label">
                                  📅 From Date
                                </div>
                                <Form.Control
                                  type="date"
                                  className="prof-input"
                                  value={item.fromDate}
                                  onChange={(e) =>
                                    handleProfessionalFieldChange(
                                      idx,
                                      "fromDate",
                                      e.target.value,
                                    )
                                  }
                                  style={{ colorScheme: "light" }}
                                />
                              </Col>
                              <Col xs={12} sm={6} md={4}>
                                <div className="prof-field-label">
                                  📅 To Date
                                </div>
                                <Form.Control
                                  type="date"
                                  className="prof-input"
                                  value={item.toDate}
                                  min={item.fromDate || undefined}
                                  onChange={(e) =>
                                    handleProfessionalFieldChange(
                                      idx,
                                      "toDate",
                                      e.target.value,
                                    )
                                  }
                                  style={{ colorScheme: "light" }}
                                />
                              </Col>
                              {duration && (
                                <Col
                                  xs={12}
                                  sm={6}
                                  md={4}
                                  className="d-flex align-items-center"
                                >
                                  <span className="prof-duration-badge">
                                    ⏱️ Duration: {duration}
                                  </span>
                                </Col>
                              )}
                              <Col xs={12} sm={6} md={4}>
                                <div className="prof-field-label">🏅 Grade</div>
                                <Form.Control
                                  className="prof-input"
                                  placeholder="e.g. A+ / First Class"
                                  value={item.grade || ""}
                                  onChange={(e) =>
                                    handleProfessionalFieldChange(
                                      idx,
                                      "grade",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Col>
                              <Col xs={6} sm={4} md={3}>
                                <div className="prof-field-label">
                                  📊 Marks Obtained
                                </div>
                                <Form.Control
                                  className="prof-input"
                                  placeholder="e.g. 450"
                                  value={item.marksObtained || ""}
                                  onChange={(e) =>
                                    handleProfessionalFieldChange(
                                      idx,
                                      "marksObtained",
                                      e.target.value,
                                    )
                                  }
                                  inputMode="numeric"
                                />
                              </Col>
                              <Col xs={6} sm={4} md={3}>
                                <div className="prof-field-label">
                                  📋 Total Marks
                                </div>
                                <Form.Control
                                  className="prof-input"
                                  placeholder="e.g. 500"
                                  value={item.totalMarks || ""}
                                  onChange={(e) =>
                                    handleProfessionalFieldChange(
                                      idx,
                                      "totalMarks",
                                      e.target.value,
                                    )
                                  }
                                  inputMode="numeric"
                                />
                              </Col>
                              {pct && (
                                <Col
                                  xs={12}
                                  sm={4}
                                  md={3}
                                  className="d-flex align-items-center"
                                >
                                  <span
                                    style={{
                                      background: "#dcfce7",
                                      color: "#166534",
                                      border: "1px solid #86efac",
                                      borderRadius: "50px",
                                      padding: "3px 12px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                    }}
                                  >
                                    📈 {pct}%
                                  </span>
                                </Col>
                              )}
                              <Col xs={12} sm={6} md={4}>
                                <div className="prof-field-label">
                                  📄 Validity
                                </div>
                                <Form.Control
                                  className="prof-input"
                                  placeholder="e.g. 2020–2023 / Lifetime"
                                  value={item.validity || ""}
                                  onChange={(e) =>
                                    handleProfessionalFieldChange(
                                      idx,
                                      "validity",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Col>
                              <Col xs={12}>
                                <div className="prof-field-label">
                                  📎 Certificate Upload
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <label
                                    className="upload-label"
                                    style={{
                                      background:
                                        "linear-gradient(135deg,#ecfeff,#cffafe)",
                                      color: "#0e7490",
                                      borderColor: "#67e8f9",
                                    }}
                                  >
                                    ⬆️ Upload
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        handleProfessionalChange(e, idx)
                                      }
                                      accept=".jpg,.jpeg,.png,.pdf"
                                    />
                                  </label>
                                  {item.file ? (
                                    <>
                                      <div
                                        style={{
                                          fontSize: "10px",
                                          color: "#0e7490",
                                          wordBreak: "break-all",
                                          maxWidth: "160px",
                                        }}
                                      >
                                        ✔ {item.file.name}
                                      </div>
                                      <button
                                        type="button"
                                        className="doc-preview-btn"
                                        onClick={() =>
                                          handlePreview({
                                            url: getObjectURL(item.file),
                                            isPdf: item.file.name
                                              .toLowerCase()
                                              .endsWith(".pdf"),
                                            label: `🎓 ${item.name || `Certificate #${idx + 1}`}`,
                                          })
                                        }
                                      >
                                        👁️ View
                                      </button>
                                    </>
                                  ) : (
                                    <span className="status-badge-pending">
                                      ⏳ Not Uploaded
                                    </span>
                                  )}
                                </div>
                              </Col>
                            </Row>
                          </div>
                        );
                      })}
                      <div style={{ textAlign: "center", marginTop: "8px" }}>
                        <button
                          type="button"
                          className="add-prof-btn"
                          onClick={addProfessionalField}
                        >
                          ➕ Add Another Education Entry
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Work Experience ── */}
                  <div className="mb-4 mb-md-5">
                    <h5 className="fw-bold mb-1" style={{ color: "#c2410c" }}>
                      💼 Work Experience
                    </h5>
                    <p className="text-muted small mb-4">
                      Add previous work experience.
                    </p>
                    <div className="exp-section-wrap">
                      {experienceEntries.map((entry, idx) => {
                        const duration = calcDuration(
                          entry.fromDate,
                          entry.toDate,
                        );
                        return (
                          <div key={idx} className="exp-entry-card">
                            <div className="exp-entry-header">
                              <span className="exp-entry-badge">
                                💼 Experience #{idx + 1}
                                {entry.companyName && (
                                  <span
                                    style={{ fontWeight: 400, opacity: 0.8 }}
                                  >
                                    {" "}
                                    — {entry.companyName}
                                  </span>
                                )}
                              </span>
                              {experienceEntries.length > 1 && (
                                <button
                                  type="button"
                                  className="remove-exp-btn"
                                  onClick={() => removeExperienceEntry(idx)}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <Row className="g-3">
                              <Col xs={12} sm={6} md={4}>
                                <div className="exp-field-label">
                                  🏢 Company Name
                                </div>
                                <Form.Control
                                  className="exp-input"
                                  placeholder="e.g. Infosys Ltd."
                                  value={entry.companyName || ""}
                                  onChange={(e) =>
                                    updateExperienceEntry(
                                      idx,
                                      "companyName",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Col>
                              <Col xs={12} sm={6} md={4}>
                                <div className="exp-field-label">
                                  🎯 Designation
                                </div>
                                <Form.Control
                                  className="exp-input"
                                  placeholder="e.g. Software Engineer"
                                  value={entry.designation || ""}
                                  onChange={(e) =>
                                    updateExperienceEntry(
                                      idx,
                                      "designation",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Col>
                              <Col xs={12} sm={6} md={4}>
                                <div className="exp-field-label">
                                  📅 From Date
                                </div>
                                <Form.Control
                                  type="date"
                                  className="exp-input"
                                  value={entry.fromDate || ""}
                                  onChange={(e) =>
                                    updateExperienceEntry(
                                      idx,
                                      "fromDate",
                                      e.target.value,
                                    )
                                  }
                                  style={{ colorScheme: "light" }}
                                />
                              </Col>
                              <Col xs={12} sm={6} md={4}>
                                <div className="exp-field-label">
                                  📅 To Date
                                </div>
                                <Form.Control
                                  type="date"
                                  className="exp-input"
                                  value={entry.toDate || ""}
                                  min={entry.fromDate || undefined}
                                  onChange={(e) =>
                                    updateExperienceEntry(
                                      idx,
                                      "toDate",
                                      e.target.value,
                                    )
                                  }
                                  style={{ colorScheme: "light" }}
                                />
                              </Col>
                              {duration && (
                                <Col
                                  xs={12}
                                  sm={6}
                                  md={4}
                                  className="d-flex align-items-center"
                                >
                                  <span className="duration-badge">
                                    ⏱️ Duration: {duration}
                                  </span>
                                </Col>
                              )}
                              <Col xs={12} sm={6} md={4}>
                                <div className="exp-field-label">
                                  👤 Reporting Name
                                </div>
                                <Form.Control
                                  className="exp-input"
                                  placeholder="e.g. Mr. Rajesh Kumar"
                                  value={entry.reportingName || ""}
                                  onChange={(e) =>
                                    updateExperienceEntry(
                                      idx,
                                      "reportingName",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Col>
                              <Col xs={12} sm={6} md={4}>
                                <div className="exp-field-label">
                                  📋 Reporting Designation
                                </div>
                                <Form.Control
                                  className="exp-input"
                                  placeholder="e.g. Team Lead"
                                  value={entry.reportingDesignation || ""}
                                  onChange={(e) =>
                                    updateExperienceEntry(
                                      idx,
                                      "reportingDesignation",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Col>
                              <Col xs={12} sm={6} md={4}>
                                <div className="exp-field-label">
                                  💰 CTC (Annual)
                                </div>
                                <Form.Control
                                  className="exp-input"
                                  placeholder="e.g. 4.5 LPA"
                                  value={entry.ctc || ""}
                                  onChange={(e) =>
                                    updateExperienceEntry(
                                      idx,
                                      "ctc",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Col>
                              <Col xs={12} sm={6} md={4}>
                                <div className="exp-field-label">
                                  📝 Remarks
                                </div>
                                <Form.Control
                                  className="exp-input"
                                  placeholder="e.g. Left for better opportunity"
                                  value={entry.remarks || ""}
                                  onChange={(e) =>
                                    updateExperienceEntry(
                                      idx,
                                      "remarks",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Col>
                              <Col xs={12}>
                                <div className="exp-field-label">
                                  📎 Experience Certificate Upload
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <label
                                    className="upload-label"
                                    style={{
                                      background:
                                        "linear-gradient(135deg,#fff7ed,#ffedd5)",
                                      color: "#c2410c",
                                      borderColor: "#fb923c",
                                    }}
                                  >
                                    ⬆️ Upload
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        handleExperienceFileChange(
                                          idx,
                                          e.target.files[0],
                                        )
                                      }
                                      accept=".jpg,.jpeg,.png,.pdf"
                                      style={{ display: "none" }}
                                    />
                                  </label>
                                  {entry.file ? (
                                    <>
                                      <div
                                        style={{
                                          fontSize: "10px",
                                          color: "#c2410c",
                                          wordBreak: "break-all",
                                          maxWidth: "160px",
                                        }}
                                      >
                                        ✔ {entry.file.name}
                                      </div>
                                      <button
                                        type="button"
                                        className="doc-preview-btn"
                                        onClick={() =>
                                          handlePreview({
                                            url: getObjectURL(entry.file),
                                            isPdf: entry.file.name
                                              .toLowerCase()
                                              .endsWith(".pdf"),
                                            label: entry.companyName
                                              ? `📑 ${entry.companyName}`
                                              : `Certificate #${idx + 1}`,
                                          })
                                        }
                                      >
                                        👁️ View
                                      </button>
                                    </>
                                  ) : (
                                    <span className="status-badge-pending">
                                      ⏳ Not Uploaded
                                    </span>
                                  )}
                                </div>
                              </Col>
                            </Row>
                          </div>
                        );
                      })}
                      <div style={{ textAlign: "center", marginTop: "8px" }}>
                        <button
                          type="button"
                          className="add-exp-btn"
                          onClick={addExperienceEntry}
                        >
                          ➕ Add Another Experience
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Documents ── */}
                  <div className="mb-4 mb-md-5" id="doc-section">
                    <h5 className="text-primary fw-bold mb-1 mb-md-2">
                      📂 Document Repository
                    </h5>
                    <p className="text-muted small mb-3">
                      Fields marked{" "}
                      <span className="text-danger fw-bold">*</span> are
                      mandatory.
                    </p>

                    {Object.keys(docErrors).length > 0 && (
                      <div
                        className="alert alert-danger py-2 px-3 mb-3 rounded-3"
                        style={{ fontSize: "13px" }}
                      >
                        <strong>❗ Missing Required Documents:</strong>
                        <ul className="mb-0 mt-1 ps-3">
                          {REQUIRED_DOC_FIELDS.filter(
                            (d) => docErrors[d.name],
                          ).map((d) => (
                            <li key={d.name}>{d.label}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="rounded-4 overflow-hidden border shadow-sm">
                      <div className="table-responsive">
                        <table className="doc-repo-table">
                          <thead>
                            <tr>
                              <th style={{ width: "30px" }}>#</th>
                              <th>Document Name</th>
                              <th style={{ width: "180px" }}>Upload</th>
                              <th style={{ width: "100px" }}>View</th>
                              <th style={{ width: "120px" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              {
                                label: "📸 Photo",
                                name: "photo",
                                required: true,
                              },
                              {
                                label: "🪪 Aadhaar Card",
                                name: "aadhaar",
                                required: true,
                              },
                              {
                                label: "💳 PAN Card",
                                name: "pan",
                                required: true,
                              },
                              {
                                label: "🗳️ Voter Card",
                                name: "voter",
                                required: false,
                              },
                              {
                                label: "🛂 Passport",
                                name: "passport",
                                required: false,
                              },
                              {
                                label: "💍 Marriage Certificate",
                                name: "marriage",
                                required: false,
                              },
                              {
                                label: "📋 Madhyamik Admit Card",
                                name: "madhyamikAdmit",
                                required: false,
                              },
                              {
                                label: "📄 10th Certificate",
                                name: "cert10",
                                required: false,
                              },
                              {
                                label: "📄 12th Certificate",
                                name: "cert12",
                                required: false,
                              },
                              {
                                label: "🎓 Graduation Certificate",
                                name: "gradCertificate",
                                required: false,
                              },
                              {
                                label: "🏛️ Master's Certificate",
                                name: "masterCertificate",
                                required: false,
                              },
                            ].map((doc, i) => (
                              <tr
                                key={doc.name}
                                className={`doc-repo-row ${docErrors[doc.name] ? "doc-error-row" : ""}`}
                              >
                                <td className="text-muted small text-center">
                                  {i + 1}
                                </td>
                                <td>
                                  {doc.label}
                                  {doc.required && (
                                    <span className="text-danger ms-1">*</span>
                                  )}
                                  {docErrors[doc.name] && (
                                    <div className="doc-error-msg">
                                      ❗ {docErrors[doc.name]}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <label
                                    className={`upload-label ${docErrors[doc.name] ? "upload-label-error" : ""}`}
                                  >
                                    ⬆️ Upload
                                    <input
                                      type="file"
                                      name={doc.name}
                                      accept=".jpg,.jpeg,.png,.pdf"
                                      hidden
                                      onChange={handleFileChange}
                                    />
                                  </label>
                                  {files[doc.name] && (
                                    <div
                                      style={{
                                        fontSize: "10px",
                                        color: "#166534",
                                        wordBreak: "break-all",
                                      }}
                                    >
                                      ✔ {files[doc.name].name}
                                    </div>
                                  )}
                                </td>
                                {/* ── FIXED VIEW BUTTON ── */}
                                <td>
                                  {files[doc.name] ? (
                                    <button
                                      type="button"
                                      className="doc-preview-btn"
                                      onClick={() =>
                                        handlePreview({
                                          url: getObjectURL(files[doc.name]),
                                          label: doc.label,
                                          isPdf: isPdfFile(
                                            files[doc.name].name,
                                          ),
                                        })
                                      }
                                    >
                                      👁️ View
                                    </button>
                                  ) : (
                                    <span className="text-muted small">—</span>
                                  )}
                                </td>
                                <td>
                                  {getDocStatus(files[doc.name], doc.name)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">
                      <span className="status-badge-uploaded">
                        ✅ {[...Object.values(files)].filter(Boolean).length}{" "}
                        Uploaded
                      </span>
                      <span className="status-badge-pending">
                        ⏳{" "}
                        {
                          REQUIRED_DOC_FIELDS.filter((d) => !files[d.name])
                            .length
                        }{" "}
                        Required Pending
                      </span>
                    </div>
                  </div>

                  <hr className="my-4 my-md-5" />
                  {(Object.keys(errors).length > 0 ||
                    Object.keys(docErrors).length > 0 ||
                    educationErrors.some(
                      (e) => e && Object.keys(e).length > 0,
                    )) && (
                      <div className="alert alert-danger mb-4 text-center fw-semibold">
                        ⚠️ Please fix all errors above before submitting.
                      </div>
                    )}
                  <div className="text-center">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="px-4 px-md-5 py-2 py-md-3 rounded-pill shadow fw-bold w-100 w-sm-auto"
                      style={{ maxWidth: "400px" }}
                    >
                      ✅ Finalize & Submit Application
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>

            {/* ── Employee Table ── */}
            <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
              <Card.Header className="bg-white border-bottom py-3 py-md-4 px-3 px-md-4">
                <div className="d-flex justify-content-between align-items-start align-items-md-center flex-column flex-md-row gap-3">
                  <div>
                    <h5 className="fw-bold mb-1 text-primary">
                      👥 Registered Employees
                    </h5>
                    <p className="text-muted mb-0 small">
                      Total: <strong>{employees.length}</strong> employees
                    </p>
                  </div>
                  <div className="d-flex gap-2 align-items-center flex-wrap w-100 w-md-auto">
                    <Form.Control
                      size="sm"
                      placeholder="🔍 Search..."
                      className="search-control"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ minWidth: "180px" }}
                    />
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={fetchEmployees}
                      >
                        🔄 Refresh
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => setAuthStep("login")}
                      >
                        🚪 Logout
                      </Button>
                    </div>
                  </div>
                </div>
              </Card.Header>
              {backendError && (
                <div className="alert alert-danger m-3 mb-0 py-2 small text-center">
                  ⚠️ Backend (port 5001) is not running.{" "}
                  <button
                    className="btn btn-link btn-sm p-0 text-danger fw-bold"
                    onClick={fetchEmployees}
                  >
                    Retry
                  </button>
                </div>
              )}
              <Card.Body className="p-0">
                {loadingList ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted small">Loading...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <p>
                      {backendError
                        ? "Backend offline — no data available."
                        : "No employees found. Register one above!"}
                    </p>
                  </div>
                ) : (
                  <div className="emp-table-wrap shadow-sm rounded-3 overflow-hidden border">
                    <div className="table-responsive">
                      <Table hover className="emp-table mb-0 align-middle">
                        <thead className="bg-primary text-white">
                          <tr
                            style={{ fontSize: "14px", whiteSpace: "nowrap" }}
                          >
                            <th className="px-3 py-3 border-0">#</th>
                            <th className="border-0">Employee</th>
                            <th className="border-0">Employee ID</th>
                            <th className="border-0">Contact Info</th>
                            <th className="border-0">Department</th>
                            <th className="border-0">Designation</th>
                            <th className="border-0 text-center">Blood</th>
                            <th className="border-0 text-center">Status</th>
                            <th className="border-0 text-center">Documents</th>
                            <th className="border-0 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((emp, idx) => (
                            <EmployeeRow
                              key={emp.id}
                              emp={emp}
                              idx={idx}
                              isExpanded={expandedRow === emp.id}
                              onToggle={handleToggleRow}
                              onDelete={deleteEmployee}
                              onPreview={handlePreview}
                            />
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default Register;
