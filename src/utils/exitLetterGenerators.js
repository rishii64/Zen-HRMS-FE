import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper: Format INR currency
export const formatINR = (val) => {
  const num = parseFloat(val) || 0;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper: Format pure numeric amount for PDF tables (ASCII safe, right-aligned)
export const formatPDFAmount = (val) => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper: Format INR with "Rs. " for PDF text (ASCII safe, no encoding issues in jsPDF)
export const formatPDFINR = (val) => {
  const num = parseFloat(val) || 0;
  return "Rs. " + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper: Convert number to words in Indian Rupees and Paise
export const amountInWords = (amount) => {
  const absAmount = Math.abs(parseFloat(amount) || 0);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ",
    "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const inWords = (n) => {
    let str = "";
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + "Crore ";
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + "Lakh ";
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + "Thousand ";
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + "Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) str += a[n];
      else str += b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : " ");
    }
    return str;
  };

  let result = "";
  if (rupees > 0) {
    result += inWords(rupees).trim() + " Rupees";
  }
  if (paise > 0) {
    result += (result ? " and " : "") + inWords(paise).trim() + " Paise";
  }
  return result + " Only";
};

// Helper to format date string
export const formatDateStr = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return String(d);
  }
};

// ══════════════════════════════════════════════════════════════════
// 1. RELIEVING LETTER GENERATOR
// ══════════════════════════════════════════════════════════════════
export const generateRelievingLetterPDF = (settlement, company = {}) => {
  const doc = new jsPDF("p", "mm", "a4");
  const compName = company.name || "Zentelex Pvt. Ltd.";
  const compAddress = company.address || "Sector V, Bidhannagar, Kolkata, West Bengal - 700091";
  const compEmail = company.email || "hr@zentelex.com";
  const refNo = settlement.relieving_letter_ref_no || `ZTL/REL/${new Date().getFullYear()}/${settlement.id || "001"}`;
  const issueDate = formatDateStr(settlement.relieving_letter_date || settlement.settlement_date || new Date());

  // Corporate Header Banner
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(compName, 105, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`${compAddress}  |  Email: ${compEmail}`, 105, 22, { align: "center" });
  doc.text("CIN: U72200WB2020PTC239871  |  Official Relieving Certificate", 105, 27, { align: "center" });

  // Reference & Date Row
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text(`Ref No: ${refNo}`, 20, 44);
  doc.text(`Date: ${issueDate}`, 190, 44, { align: "right" });

  // Recipient Box
  doc.setFontSize(10);
  doc.text("To,", 20, 54);
  doc.setFont("helvetica", "bold");
  doc.text(settlement.employee_name || "Employee Name", 20, 60);
  doc.setFont("helvetica", "normal");
  doc.text(`Employee Code: ${settlement.employee_id}`, 20, 65);
  doc.text(`Designation: ${settlement.designation || "Staff"}`, 20, 70);
  doc.text(`Department: ${settlement.dept || "General"}`, 20, 75);

  // Subject
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("SUBJECT: OFFICIAL RELIEVING LETTER & SEPARATION CLEARANCE", 105, 87, { align: "center" });
  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(20, 90, 190, 90);

  // Salutation & Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Dear ${settlement.employee_name || "Colleague"},`, 20, 99);

  const p1 = `This is in reference to your formal resignation letter dated ${formatDateStr(settlement.resignation_date)}. We hereby confirm the acceptance of your resignation and you stand officially relieved from your duties and responsibilities as ${settlement.designation || "Staff"} at ${compName} at the close of business hours on ${formatDateStr(settlement.last_working_date)}.`;

  const p2 = "We confirm that you have successfully fulfilled all departmental handover responsibilities, transferred all ongoing project artifacts, and surrendered all company assets, hardware, identification badges, credentials, and confidential files. Formal clearances across IT, Finance, Operations, and HR departments have been satisfactorily recorded.";

  const p3 = `Your Full & Final (F&F) Settlement accounts have been prepared, audited, and processed. There are no outstanding liabilities, financial obligations, or claims pending between you and ${compName}.`;

  const p4 = `During your tenure with us from ${formatDateStr(settlement.joining_date)} to ${formatDateStr(settlement.last_working_date)}, your conduct, professional ethics, and performance have been commendable. We sincerely thank you for your commitment and valuable contributions to the growth of ${compName}, and we wish you the very best in all your future professional and personal endeavors.`;

  let y = 107;
  const splitP1 = doc.splitTextToSize(p1, 170);
  doc.text(splitP1, 20, y);
  y += splitP1.length * 5.2 + 3;

  const splitP2 = doc.splitTextToSize(p2, 170);
  doc.text(splitP2, 20, y);
  y += splitP2.length * 5.2 + 3;

  const splitP3 = doc.splitTextToSize(p3, 170);
  doc.text(splitP3, 20, y);
  y += splitP3.length * 5.2 + 3;

  const splitP4 = doc.splitTextToSize(p4, 170);
  doc.text(splitP4, 20, y);
  y += splitP4.length * 5.2 + 12;

  // Signatory & Stamp Block
  doc.setFont("helvetica", "normal");
  doc.text("Sincerely,", 20, y);
  doc.setFont("helvetica", "bold");
  doc.text(`For ${compName}`, 20, y + 6);

  // Digital Signature / Stamp Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, y + 10, 65, 26, 3, 3, "FD");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("DIGITALLY SIGNED & VERIFIED", 52.5, y + 17, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("HUMAN RESOURCES DEPT.", 52.5, y + 23, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Doc ID: ${refNo}`, 52.5, y + 29, { align: "center" });

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory", 20, y + 43);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Human Resources Department  |  Zentelex Pvt. Ltd.", 20, y + 48);

  // Footer Disclaimer
  doc.setLineWidth(0.3);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 280, 190, 280);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("This document is an electronically generated and authentic corporate certificate issued by Zentelex Pvt. Ltd. HRMS.", 105, 285, { align: "center" });

  doc.save(`Relieving_Letter_${settlement.employee_id}_${settlement.employee_name?.replace(/\s+/g, "_")}.pdf`);
};

// ══════════════════════════════════════════════════════════════════
// 2. EXPERIENCE & SERVICE CERTIFICATE GENERATOR
// ══════════════════════════════════════════════════════════════════
export const generateExperienceCertificatePDF = (settlement, company = {}) => {
  const doc = new jsPDF("p", "mm", "a4");
  const compName = company.name || "Zentelex Pvt. Ltd.";
  const compAddress = company.address || "Sector V, Bidhannagar, Kolkata, West Bengal - 700091";
  const compEmail = company.email || "hr@zentelex.com";
  const refNo = settlement.experience_letter_ref_no || `ZTL/EXP/${new Date().getFullYear()}/${settlement.id || "001"}`;
  const issueDate = formatDateStr(settlement.experience_letter_date || settlement.settlement_date || new Date());

  // Corporate Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(compName, 105, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`${compAddress}  |  Email: ${compEmail}`, 105, 22, { align: "center" });
  doc.text("Corporate Identity Number (CIN): U72200WB2020PTC239871", 105, 27, { align: "center" });

  // Reference & Date Row
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text(`Certificate Ref: ${refNo}`, 20, 44);
  doc.text(`Date of Issue: ${issueDate}`, 190, 44, { align: "right" });

  // Main Heading
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("TO WHOMSOEVER IT MAY CONCERN", 105, 60, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(99, 102, 241); // Indigo
  doc.text("EXPERIENCE & SERVICE CERTIFICATE", 105, 67, { align: "center" });

  doc.setLineWidth(0.5);
  doc.setDrawColor(99, 102, 241);
  doc.line(65, 70, 145, 70);

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);

  const tenureYears = settlement.tenure_years || "1.0";
  const p1 = `This is to certify that ${settlement.employee_name} (Employee Code: ${settlement.employee_id}) was actively employed with ${compName} from ${formatDateStr(settlement.joining_date)} to ${formatDateStr(settlement.last_working_date)}.`;

  const p2 = `During their tenure of approximately ${tenureYears} year(s) with our organization, they served in the designation of ${settlement.designation || "Staff"} in the ${settlement.dept || "General"} Department.`;

  const p3 = `Performance & Professional Conduct:\nThroughout their association with the company, we observed ${settlement.employee_name} to be industrious, responsible, and dedicated in executing their assignments. They exhibited strong problem-solving capabilities, exemplary technical competency, and worked constructively in multidisciplinary teams. Their conduct, integrity, and character have been ${settlement.conduct_remarks || "Exemplary"}.`;

  const p4 = `They have been formally relieved from their duties on ${formatDateStr(settlement.last_working_date)} following the successful completion of all transition procedures and handover protocols. We appreciate their service to ${compName} and take this opportunity to wish them every success in their prospective career path.`;

  let y = 84;
  const splitP1 = doc.splitTextToSize(p1, 170);
  doc.text(splitP1, 20, y);
  y += splitP1.length * 5.6 + 4;

  const splitP2 = doc.splitTextToSize(p2, 170);
  doc.text(splitP2, 20, y);
  y += splitP2.length * 5.6 + 4;

  const splitP3 = doc.splitTextToSize(p3, 170);
  doc.text(splitP3, 20, y);
  y += splitP3.length * 5.6 + 4;

  const splitP4 = doc.splitTextToSize(p4, 170);
  doc.text(splitP4, 20, y);
  y += splitP4.length * 5.6 + 16;

  // Signatory Block
  doc.setFont("helvetica", "bold");
  doc.text(`For ${compName}`, 20, y);

  // Corporate Stamp Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, y + 8, 65, 26, 3, 3, "FD");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("VERIFIED OFFICIAL SERVICE RECORD", 52.5, y + 15, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("ZENTELEX PVT. LTD.", 52.5, y + 21, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("KOLKATA HQ • INDIA", 52.5, y + 27, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory", 20, y + 43);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Human Resources Department  |  Zentelex Pvt. Ltd.", 20, y + 48);

  // Footer Disclaimer
  doc.setLineWidth(0.3);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 280, 190, 280);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("This certificate is an official record issued without any alterations or liability on the part of the issuing authority.", 105, 285, { align: "center" });

  doc.save(`Experience_Certificate_${settlement.employee_id}_${settlement.employee_name?.replace(/\s+/g, "_")}.pdf`);
};

// ══════════════════════════════════════════════════════════════════
// 3. FULL & FINAL (F&F) SETTLEMENT STATEMENT SLIP
// ══════════════════════════════════════════════════════════════════
export const generateFnfSettlementSlipPDF = (settlement, company = {}) => {
  const doc = new jsPDF("p", "mm", "a4");
  const compName = company.name || "Zentelex Pvt. Ltd.";
  const refNo = settlement.settlement_ref_no || `ZTL/FNF/${new Date().getFullYear()}/${settlement.id || "001"}`;
  const issueDate = formatDateStr(settlement.settlement_date || new Date());

  // Header Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, 210, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(compName, 105, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("FULL & FINAL (F&F) EXIT SETTLEMENT STATEMENT", 105, 23, { align: "center" });
  doc.setFontSize(8.5);
  doc.setTextColor(224, 231, 255);
  doc.text(`Official Settlement Slip  |  Ref: ${refNo}  |  Date: ${issueDate}`, 105, 29, { align: "center" });

  // Employee Master Profile Table (Width = 170mm, Margins: 20mm left & right)
  autoTable(doc, {
    startY: 38,
    margin: { left: 20, right: 20 },
    theme: "grid",
    head: [["EMPLOYEE SETTLEMENT SUMMARY", ""]],
    body: [
      ["Employee Name", settlement.employee_name || "—"],
      ["Employee Code", settlement.employee_id || "—"],
      ["Department / Designation", `${settlement.dept || "General"}  /  ${settlement.designation || "Staff"}`],
      ["Date of Joining", formatDateStr(settlement.joining_date)],
      ["Resignation Date / Last Working Date", `${formatDateStr(settlement.resignation_date)}  to  ${formatDateStr(settlement.last_working_date)}`],
      ["Notice Period / Notice Shortfall", `${settlement.notice_period_days || 30} Days Required  |  ${settlement.notice_shortfall_days || 0} Days Shortfall ${settlement.notice_waiver_granted ? "(WAIVED)" : ""}`],
      ["Monthly Gross / Daily Rate (Gross/26)", `Rs. ${formatPDFAmount(settlement.monthly_gross)}  |  Rs. ${formatPDFAmount(settlement.per_day_rate)} / day`],
      ["Settlement Status / Payment Status", `${settlement.status || "Finalized"}  |  ${settlement.payment_status || "Pending"}`],
      ["Bank Details (Disbursement Account)", `${settlement.bank_name || "State Bank of India"} - A/C: ${settlement.bank_account_no || "—"} (IFSC: ${settlement.ifsc_code || "—"})`]
    ],
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9.5 },
    styles: { fontSize: 8.5, cellPadding: 2.2, font: "helvetica" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 65 },
      1: { cellWidth: 105 }
    }
  });

  const finalY1 = doc.lastAutoTable.finalY + 4;

  // Earnings vs Deductions Breakdown Table
  const earningsList = [
    ["Unpaid Salary for Worked Days in Final Month", `${parseFloat(settlement.unpaid_salary_days || 0).toFixed(2)} Days`, formatPDFAmount(settlement.unpaid_salary_amount)],
    ["Earned & Privilege Leave Encashment", `${parseFloat(settlement.leave_encashment_days || 0).toFixed(2)} Days @ Basic Rate`, formatPDFAmount(settlement.leave_encashment_amount)],
    ["Statutory Gratuity Settlement", settlement.gratuity_eligible ? `${settlement.tenure_years} Years (Statutory Formula)` : "Not Eligible (< 5 Yrs)", formatPDFAmount(settlement.gratuity_amount)],
    ["Performance Bonus / Incentive Payment", "Discretionary Bonus", formatPDFAmount(settlement.bonus_incentive_amount)],
    ["Approved Expense Reimbursements", "Claims Cleared", formatPDFAmount(settlement.reimbursement_amount)],
    ["Other Additions / Special Allowance", settlement.other_earnings_remarks || "Miscellaneous", formatPDFAmount(settlement.other_earnings)],
    ["TOTAL GROSS EARNINGS & ENTITLEMENTS (A)", "", formatPDFAmount(settlement.total_earnings)]
  ];

  const deductionsList = [
    ["Notice Period Shortfall Recovery", settlement.notice_waiver_granted ? "Waived by Management" : `${settlement.notice_shortfall_days || 0} Days Shortfall`, formatPDFAmount(settlement.notice_recovery_amount)],
    ["Outstanding Loan Principal / EMI Recovery", "Payroll Facility Adjustment", formatPDFAmount(settlement.loan_outstanding_recovery)],
    ["Advance Salary Balance Recovery", "Adjustment", formatPDFAmount(settlement.advance_salary_recovery)],
    ["Unreturned Asset Damage / Replacement", "IT / Admin Recovery", formatPDFAmount(settlement.asset_damage_recovery)],
    ["Statutory Provident Fund (PF)", "Employee PF Contribution", formatPDFAmount(settlement.statutory_pf)],
    ["Statutory ESI Contribution", "Employee ESI", formatPDFAmount(settlement.statutory_esi)],
    ["Professional Tax (PT)", "State Statutory Tax", formatPDFAmount(settlement.statutory_pt)],
    ["TDS / Tax Withheld", "Tax Deduction", formatPDFAmount(settlement.tax_tds_deduction)],
    ["Other Deductions / Adjustments", settlement.other_deductions_remarks || "Miscellaneous", formatPDFAmount(settlement.other_deductions)],
    ["TOTAL RECOVERIES & DEDUCTIONS (B)", "", formatPDFAmount(settlement.total_deductions)]
  ];

  autoTable(doc, {
    startY: finalY1,
    margin: { left: 20, right: 20 },
    theme: "striped",
    head: [["A. EARNINGS & ENTITLEMENTS", "DETAILS", "AMOUNT (INR)"]],
    body: earningsList,
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9
    },
    styles: { fontSize: 8, cellPadding: 2, font: "helvetica" },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 40, halign: "left" },
      2: { cellWidth: 35, halign: "right", fontStyle: "bold" }
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index === 2) {
        data.cell.styles.halign = "right";
      }
      if (data.row.index === earningsList.length - 1) {
        data.cell.styles.fillColor = [236, 253, 245];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [6, 95, 70];
      }
    }
  });

  const finalY2 = doc.lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: finalY2,
    margin: { left: 20, right: 20 },
    theme: "striped",
    head: [["B. RECOVERIES & DEDUCTIONS", "DETAILS", "AMOUNT (INR)"]],
    body: deductionsList,
    headStyles: {
      fillColor: [239, 68, 68],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9
    },
    styles: { fontSize: 8, cellPadding: 2, font: "helvetica" },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 40, halign: "left" },
      2: { cellWidth: 35, halign: "right", fontStyle: "bold" }
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index === 2) {
        data.cell.styles.halign = "right";
      }
      if (data.row.index === deductionsList.length - 1) {
        data.cell.styles.fillColor = [254, 242, 242];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [153, 27, 27];
      }
    }
  });

  // Net Payable Card (Width = 170mm, flush aligned with tables)
  const netY = doc.lastAutoTable.finalY + 5;
  const isPayable = (parseFloat(settlement.net_payable_amount) || 0) >= 0;
  const netAmount = Math.abs(parseFloat(settlement.net_payable_amount) || 0);

  doc.setFillColor(isPayable ? 240 : 254, isPayable ? 253 : 242, isPayable ? 244 : 242);
  doc.setDrawColor(isPayable ? 16 : 239, isPayable ? 185 : 68, isPayable ? 129 : 68);
  doc.setLineWidth(0.4);
  doc.roundedRect(20, netY, 170, 22, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(isPayable ? 6 : 153, isPayable ? 95 : 27, isPayable ? 70 : 27);
  doc.text(
    isPayable ? "NET SETTLEMENT PAYABLE TO EMPLOYEE (A - B):" : "NET RECOVERABLE FROM EMPLOYEE (B - A):",
    25,
    netY + 9
  );

  doc.setFontSize(13);
  doc.text(`Rs. ${formatPDFAmount(netAmount)}`, 185, netY + 9, { align: "right" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Amount in Words: ${amountInWords(netAmount)}`, 25, netY + 16);

  // Signatures Row (Flush with left 20mm and right 190mm margins)
  const sigY = netY + 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  doc.text("Prepared By: HR / Payroll Dept.", 20, sigY);
  doc.text("Verified By: Accounts & Finance", 105, sigY, { align: "center" });
  doc.text("Employee Acknowledgment Signature", 190, sigY, { align: "right" });

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(20, sigY + 12, 65, sigY + 12);
  doc.line(82.5, sigY + 12, 127.5, sigY + 12);
  doc.line(145, sigY + 12, 190, sigY + 12);

  doc.save(`FnF_Settlement_Slip_${settlement.employee_id}_${settlement.employee_name?.replace(/\s+/g, "_")}.pdf`);
};

// ══════════════════════════════════════════════════════════════════
// 4. CORPORATE OFFER & APPOINTMENT LETTER GENERATOR
// ══════════════════════════════════════════════════════════════════
export const generateOfferLetterPDF = (offer, company = {}) => {
  const doc = new jsPDF("p", "mm", "a4");
  const compName = company.name || "Zentelex Pvt. Ltd.";
  const compAddress = company.address || "Sector V, Bidhannagar, Kolkata, West Bengal - 700091";
  const compEmail = company.email || "hr@zentelex.com";
  const refNo = offer.offer_code || `ZTL/OFF/${new Date().getFullYear()}/${offer.id?.substring(0, 4) || "0001"}`;
  const issueDate = formatDateStr(offer.createdAt || new Date());

  // ---------------- PAGE 1: OFFER & APPOINTMENT ----------------
  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(compName, 105, 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`${compAddress}  |  Email: ${compEmail}`, 105, 21, { align: "center" });
  doc.text("CIN: U72200WB2020PTC239871  |  Official Letter of Employment Offer", 105, 26, { align: "center" });

  // Reference & Date Row
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text(`Offer Ref: ${refNo}`, 20, 42);
  doc.text(`Date of Issue: ${issueDate}`, 190, 42, { align: "right" });

  // Candidate Details
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("To,", 20, 52);
  doc.text(offer.candidate_name || "Candidate Name", 20, 58);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Email: ${offer.candidate_email || "—"}  |  Phone: ${offer.candidate_phone || "—"}`, 20, 64);
  if (offer.candidate_address) {
    doc.text(`Address: ${offer.candidate_address}`, 20, 69);
  }

  // Subject Header
  const subjectY = offer.candidate_address ? 77 : 73;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(79, 70, 229); // Indigo 600
  doc.text(`SUBJECT: FORMAL OFFER OF EMPLOYMENT - ${offer.designation?.toUpperCase() || "POSITION"}`, 105, subjectY, { align: "center" });
  doc.setDrawColor(224, 231, 255);
  doc.line(20, subjectY + 3, 190, subjectY + 3);

  // Salutation & Intro
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Dear ${offer.candidate_name},`, 20, subjectY + 11);

  const introText = `With reference to your application and the subsequent rounds of evaluations you had with us, we are delighted to offer you the position of ${offer.designation} in the ${offer.department} Department at ${compName}. We were thoroughly impressed with your credentials, professional background, and enthusiasm, and we believe you will be an invaluable asset to our organization.`;
  const splitIntro = doc.splitTextToSize(introText, 170);
  doc.text(splitIntro, 20, subjectY + 17);

  // Role Overview Table
  const table1StartY = subjectY + 17 + splitIntro.length * 4.8 + 3;
  autoTable(doc, {
    startY: table1StartY,
    margin: { left: 20, right: 20 },
    theme: "grid",
    head: [["APPOINTMENT & ENGAGEMENT OVERVIEW", "DETAILS"]],
    body: [
      ["Designation / Position", offer.designation || "Staff"],
      ["Department", offer.department || "General"],
      ["Reporting Manager / Supervisor", offer.reporting_manager || "Department Head"],
      ["Work Location / Base Office", offer.work_location || "Kolkata HQ"],
      ["Employment Classification", offer.employment_type || "Full Time (Probation)"],
      ["Proposed Date of Joining", formatDateStr(offer.joining_date)],
      ["Probationary Assessment Period", `${offer.probation_period_months || 6} Months from Date of Joining`],
      ["Separation Notice Period", `${offer.notice_period_days || 30} Days (Post Confirmation)`],
      ["Offer Acceptance Expiry Date", `${formatDateStr(offer.offer_expiry_date)} (5:00 PM IST)`],
    ],
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2, font: "helvetica" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 70 },
      1: { cellWidth: 100 },
    },
  });

  // Summary Terms & Conditions - Structured & Auto-wrapped Table
  const termsY = doc.lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: termsY,
    margin: { left: 20, right: 20 },
    theme: "plain",
    head: [[{ content: "SUMMARY TERMS & CONDITIONS OF APPOINTMENT", colSpan: 2 }]],
    body: [
      ["1. Regularization", "Your appointment is subject to satisfactory completion of your probationary period."],
      ["2. Verification", "This offer is contingent upon successful verification of your educational background, previous employment records, and reference checks."],
      ["3. Code of Conduct", "You will adhere to the policies, confidentiality agreements, and proprietary rights protocols of Zentelex Pvt. Ltd."],
      ["4. Timely Acceptance", "Please submit your signed or digital acceptance on or before the offer expiry date specified above."],
    ],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 2.2,
      halign: "left",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [71, 85, 105],
      font: "helvetica",
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold", textColor: [15, 23, 42] },
      1: { cellWidth: 132 },
    },
  });

  // Page 1 Footer Note
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Page 1 of 2  •  Please review Annexure A on next page for full compensation structure and acceptance endorsement.", 105, 285, { align: "center" });

  // ---------------- PAGE 2: COMPENSATION ANNEXURE & ACCEPTANCE ----------------
  doc.addPage();

  // Page 2 Header Strip
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${compName}  •  ANNEXURE A: COMPENSATION & BENEFITS STRUCTURE`, 105, 11, { align: "center" });

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(`Candidate: ${offer.candidate_name}`, 20, 25);
  doc.text(`Position: ${offer.designation}`, 105, 25, { align: "center" });
  doc.text(`Offer Ref: ${refNo}`, 190, 25, { align: "right" });

  // Compensation Table
  const basic = parseFloat(offer.monthly_basic || 0);
  const hra = parseFloat(offer.monthly_hra || 0);
  const special = parseFloat(offer.monthly_special_allowance || 0);
  const conveyance = parseFloat(offer.monthly_conveyance || 0);
  const medical = parseFloat(offer.monthly_medical || 0);
  const gross = parseFloat(offer.monthly_gross || 0);
  const annualGross = gross * 12;
  const pfAnnual = parseFloat(offer.employer_pf_annual || 0);
  const bonus = parseFloat(offer.annual_performance_bonus || 0);
  const ctc = parseFloat(offer.annual_ctc || 0);

  const compData = [
    ["Basic Salary (50% of Fixed Gross)", formatPDFAmount(basic), formatPDFAmount(basic * 12)],
    ["House Rent Allowance (HRA)", formatPDFAmount(hra), formatPDFAmount(hra * 12)],
    ["Special Allowance", formatPDFAmount(special), formatPDFAmount(special * 12)],
    ["Statutory Conveyance Allowance", formatPDFAmount(conveyance), formatPDFAmount(conveyance * 12)],
    ["Statutory Medical Allowance", formatPDFAmount(medical), formatPDFAmount(medical * 12)],
    ["TOTAL MONTHLY GROSS REMUNERATION", formatPDFAmount(gross), formatPDFAmount(annualGross)],
    ["Employer Provident Fund (PF) Contribution", formatPDFAmount(pfAnnual / 12), formatPDFAmount(pfAnnual)],
    ["Annual Performance Incentive / Bonus", "—", formatPDFAmount(bonus)],
    ["TOTAL ANNUAL COST TO COMPANY (CTC)", "", formatPDFAmount(ctc)],
  ];

  autoTable(doc, {
    startY: 30,
    margin: { left: 20, right: 20 },
    theme: "striped",
    head: [["COMPENSATION COMPONENT", "MONTHLY (INR)", "ANNUALIZED (INR)"]],
    body: compData,
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2.2, font: "helvetica" },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 38, halign: "right" },
      2: { cellWidth: 37, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "head" && (data.column.index === 1 || data.column.index === 2)) {
        data.cell.styles.halign = "right";
      }
      // Highlight Total Monthly Gross
      if (data.row.index === 5) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = "bold";
      }
      // Highlight Total Annual CTC
      if (data.row.index === compData.length - 1) {
        data.cell.styles.fillColor = [236, 253, 245];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [6, 95, 70];
      }
    },
  });

  // Amount in Words
  const wordY = doc.lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Total CTC in Words: ${amountInWords(ctc)}`, 20, wordY);

  if (offer.other_benefits_notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Additional Perquisites & Perks: ${offer.other_benefits_notes}`, 20, wordY + 5);
  }

  // ---------------- SIGN-OFF SECTION: Symmetrical 2-Column Cards ----------------
  const signY = wordY + (offer.other_benefits_notes ? 14 : 10);
  const cardWidth = 80;
  const cardHeight = 44;
  const leftX = 20;
  const rightX = 110;

  // Section Titles
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${compName}`, leftX, signY);
  doc.text("Candidate Acceptance Endorsement:", rightX, signY);

  const cardTopY = signY + 3.5;

  // LEFT CARD: Authorized Employer Signatory
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftX, cardTopY, cardWidth, cardHeight, 2, 2, "FD");

  // Left Card Header Bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(leftX, cardTopY, cardWidth, 7, 2, 2, "F");
  doc.rect(leftX, cardTopY + 5, cardWidth, 2, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.text("OFFICIALLY AUTHORIZED & SEALED", leftX + cardWidth / 2, cardTopY + 5, { align: "center" });

  // Company Name & Department
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("ZENTELEX PVT. LTD.", leftX + cardWidth / 2, cardTopY + 14, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("HR OPERATIONS • KOLKATA HQ", leftX + cardWidth / 2, cardTopY + 19, { align: "center" });

  // Divider inside left card
  doc.setDrawColor(226, 232, 240);
  doc.line(leftX + 8, cardTopY + 23, leftX + cardWidth - 8, cardTopY + 23);

  // Official Signatory Name & Title
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(offer.official_signatory_name || "Head - Human Resources", leftX + cardWidth / 2, cardTopY + 31, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(offer.official_signatory_title || "Human Resources Department", leftX + cardWidth / 2, cardTopY + 36, { align: "center" });

  // RIGHT CARD: Candidate Acceptance Block
  const isAccepted = offer.candidate_decision === "ACCEPTED" || offer.offer_status === "ACCEPTED";

  if (isAccepted) {
    // Green verified digital acceptance card
    doc.setFillColor(240, 253, 244); // Emerald 50
    doc.setDrawColor(16, 185, 129); // Emerald 500
    doc.setLineWidth(0.4);
    doc.roundedRect(rightX, cardTopY, cardWidth, cardHeight, 2, 2, "FD");

    // Green Header Strip
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.roundedRect(rightX, cardTopY, cardWidth, 7, 2, 2, "F");
    doc.rect(rightX, cardTopY + 5, cardWidth, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("DIGITALLY ACCEPTED & ENDORSED", rightX + cardWidth / 2, cardTopY + 5, { align: "center" });

    // Acceptance Details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text("Digitally Signed by:", rightX + 6, cardTopY + 13.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${offer.candidate_signature_name || offer.candidate_name}`, rightX + 32, cardTopY + 13.5);

    doc.setFont("helvetica", "normal");
    doc.text("Confirmed Joining:", rightX + 6, cardTopY + 19);
    doc.setFont("helvetica", "bold");
    doc.text(`${formatDateStr(offer.candidate_confirmed_joining_date || offer.joining_date)}`, rightX + 32, cardTopY + 19);

    doc.setFont("helvetica", "normal");
    doc.text("Accepted on:", rightX + 6, cardTopY + 24.5);
    doc.text(`${formatDateStr(offer.candidate_decided_at || new Date())}`, rightX + 32, cardTopY + 24.5);

    // Subtle separator
    doc.setDrawColor(187, 247, 208);
    doc.line(rightX + 6, cardTopY + 28.5, rightX + cardWidth - 6, cardTopY + 28.5);

    // Audit trail
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Audit Token: ${offer.acceptance_token ? offer.acceptance_token.substring(0, 24) + "..." : "Verified"}`, rightX + 6, cardTopY + 34);
    doc.text(`IP: ${offer.candidate_ip_address || "127.0.0.1"}  •  Status: Verified & Tamper-Evident`, rightX + 6, cardTopY + 39);
  } else {
    // Pending State
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(rightX, cardTopY, cardWidth, cardHeight, 2, 2, "FD");

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(rightX, cardTopY, cardWidth, 7, 2, 2, "F");
    doc.rect(rightX, cardTopY + 5, cardWidth, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("PENDING CANDIDATE ACCEPTANCE", rightX + cardWidth / 2, cardTopY + 5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    const acceptNote = doc.splitTextToSize("I hereby accept the employment offer on the terms and conditions detailed in this document.", cardWidth - 12);
    doc.text(acceptNote, rightX + 6, cardTopY + 14);

    doc.setDrawColor(203, 213, 225);
    doc.line(rightX + 10, cardTopY + 33, rightX + cardWidth - 10, cardTopY + 33);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Candidate Signature & Date", rightX + cardWidth / 2, cardTopY + 38, { align: "center" });
  }

  // Page 2 Footer
  doc.setLineWidth(0.3);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 280, 190, 280);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Page 2 of 2  •  Official Employment Offer Document  •  Zentelex Pvt. Ltd.", 105, 285, { align: "center" });

  doc.save(`Offer_Letter_${offer.candidate_name?.replace(/\s+/g, "_")}_${refNo.replace(/\//g, "_")}.pdf`);
};




// ============================================================================
// 4. EMPLOYEE EXPENSE & TRAVEL REIMBURSEMENT VOUCHER PDF GENERATOR
// ============================================================================
export const generateClaimVoucherPDF = (claim, company = {}) => {
  const doc = new jsPDF("p", "mm", "a4");
  const compName = company.name || "Zentelex Pvt. Ltd.";
  const compAddress = company.address || "Sector V, Bidhannagar, Kolkata, West Bengal - 700091";
  const compEmail = company.email || "accounts@zentelex.com";
  const claimNo = claim.claim_number || `CLM-${new Date().getFullYear()}-0001`;
  const claimDate = formatDateStr(claim.createdAt || new Date());

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(compName, 105, 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`${compAddress}  |  Email: ${compEmail}`, 105, 19, { align: "center" });
  doc.text("Official Employee Expense & Travel Reimbursement Voucher", 105, 24, { align: "center" });

  // Voucher Meta Row
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Voucher No: ${claimNo}`, 20, 38);
  doc.text(`Submission Date: ${claimDate}`, 105, 38, { align: "center" });
  doc.text(`Status: ${claim.status?.replace(/_/g, " ")}`, 190, 38, { align: "right" });

  // Employee & Travel Overview Cards (2 Columns)
  autoTable(doc, {
    startY: 43,
    margin: { left: 20, right: 20 },
    theme: "grid",
    head: [["EMPLOYEE INFORMATION", "CLAIM & TRAVEL PURPOSE"]],
    body: [
      [
        `Employee: ${claim.employee_name || "—"}\nID: ${claim.employee_id || "—"}\nDepartment: ${claim.department || "General"}\nDesignation: ${claim.designation || "Staff"}`,
        `Claim Title: ${claim.title || "—"}\nCategory: ${claim.claim_type?.replace(/_/g, " ") || "TRAVEL"}` +
        (claim.travel_destination ? `\nDestination: ${claim.travel_destination}` : "") +
        (claim.travel_start_date ? `\nTravel Period: ${formatDateStr(claim.travel_start_date)} to ${formatDateStr(claim.travel_end_date)}` : "") +
        (claim.purpose ? `\nPurpose: ${claim.purpose}` : "")
      ]
    ],
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5, font: "helvetica", textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 85 },
    },
  });

  // Itemized Expenses Table
  const items = claim.items || [];
  const tableData = items.map((item, idx) => [
    String(idx + 1),
    formatDateStr(item.expense_date),
    item.category || "General",
    item.merchant_name || item.description || "—",
    item.bill_number || "—",
    formatPDFAmount(item.amount),
    formatPDFAmount(item.approved_amount !== null && item.approved_amount !== undefined ? item.approved_amount : item.amount),
  ]);

  if (tableData.length === 0) {
    tableData.push(["1", claimDate, claim.claim_type || "Expense", claim.title, "—", formatPDFAmount(claim.total_amount), formatPDFAmount(claim.approved_amount || claim.total_amount)]);
  }

  // Summary Row
  const totalClaimed = parseFloat(claim.total_amount) || 0;
  const totalApproved = parseFloat(claim.approved_amount !== null && claim.approved_amount !== undefined ? claim.approved_amount : claim.total_amount) || 0;

  tableData.push([
    "",
    "",
    "TOTAL REIMBURSEMENT AMOUNT (INR)",
    "",
    "",
    formatPDFAmount(totalClaimed),
    formatPDFAmount(totalApproved),
  ]);

  const itemTableStartY = doc.lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: itemTableStartY,
    margin: { left: 20, right: 20 },
    theme: "striped",
    head: [["#", "DATE", "CATEGORY", "MERCHANT / DESCRIPTION", "BILL / REF", "CLAIMED (INR)", "APPROVED (INR)"]],
    body: tableData,
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, font: "helvetica" },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 28 },
      3: { cellWidth: 47 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 20, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "head" && (data.column.index === 5 || data.column.index === 6)) {
        data.cell.styles.halign = "right";
      }
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = [236, 253, 245];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [6, 95, 70];
      }
    },
  });

  // Amount in Words
  const wordY = doc.lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Approved Amount in Words: ${amountInWords(totalApproved)}`, 20, wordY);

  // ---------------- 3-COLUMN MULTI-STAGE APPROVAL & SETTLEMENT CARDS ----------------
  const signY = wordY + 8;
  const colWidth = 54;
  const cardHeight = 44;
  const c1X = 20;
  const c2X = 78;
  const c3X = 136;

  // Box 1: Employee Endorsement
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c1X, signY, colWidth, cardHeight, 2, 2, "FD");

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(c1X, signY, colWidth, 6, 2, 2, "F");
  doc.rect(c1X, signY + 4, colWidth, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");
  doc.text("1. CLAIMANT SUBMISSION", c1X + colWidth / 2, signY + 4.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(`Submitted by: ${claim.employee_name || "Employee"}`, c1X + 4, signY + 11);
  doc.text(`Emp ID: ${claim.employee_id || "—"}`, c1X + 4, signY + 16);
  doc.text(`Date: ${claimDate}`, c1X + 4, signY + 21);
  doc.setDrawColor(226, 232, 240);
  doc.line(c1X + 4, signY + 34, c1X + colWidth - 4, signY + 34);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Claimant Digital Declaration", c1X + colWidth / 2, signY + 39, { align: "center" });

  // Box 2: Line Manager / HOD Approval
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c2X, signY, colWidth, cardHeight, 2, 2, "FD");

  const managerApproved = claim.manager_decision === "APPROVED" || ["APPROVED_BY_MANAGER", "APPROVED_BY_FINANCE", "PAID"].includes(claim.status);
  doc.setFillColor(managerApproved ? [236, 253, 245] : [241, 245, 249]);
  doc.roundedRect(c2X, signY, colWidth, 6, 2, 2, "F");
  doc.rect(c2X, signY + 4, colWidth, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(managerApproved ? [6, 95, 70] : [71, 85, 105]);
  doc.setFont("helvetica", "bold");
  doc.text(managerApproved ? "2. MANAGER VERIFIED & APPROVED" : "2. MANAGER REVIEW", c2X + colWidth / 2, signY + 4.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(`Manager: ${claim.manager_name || "Department Head"}`, c2X + 4, signY + 11);
  doc.text(`Decision: ${claim.manager_decision || (managerApproved ? "APPROVED" : "PENDING")}`, c2X + 4, signY + 16);
  doc.text(`Date: ${formatDateStr(claim.manager_decision_at || claimDate)}`, c2X + 4, signY + 21);
  doc.setDrawColor(226, 232, 240);
  doc.line(c2X + 4, signY + 34, c2X + colWidth - 4, signY + 34);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Authorized Line Manager Seal", c2X + colWidth / 2, signY + 39, { align: "center" });

  // Box 3: Finance / Accounts Audit & Settlement
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c3X, signY, colWidth, cardHeight, 2, 2, "FD");

  const isDisbursed = claim.status === "PAID";
  const financeApproved = claim.finance_decision === "APPROVED" || ["APPROVED_BY_FINANCE", "PAID"].includes(claim.status);

  doc.setFillColor(isDisbursed ? [236, 253, 245] : [241, 245, 249]);
  doc.roundedRect(c3X, signY, colWidth, 6, 2, 2, "F");
  doc.rect(c3X, signY + 4, colWidth, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(isDisbursed ? [6, 95, 70] : [71, 85, 105]);
  doc.setFont("helvetica", "bold");
  doc.text(isDisbursed ? "3. DISBURSED & SETTLED" : (financeApproved ? "3. FINANCE SANCTIONED" : "3. FINANCE AUDIT"), c3X + colWidth / 2, signY + 4.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(`Finance Officer: ${claim.finance_name || "Accounts Dept"}`, c3X + 4, signY + 11);
  if (isDisbursed) {
    doc.text(`Mode: ${claim.payment_mode || "Bank Transfer"}`, c3X + 4, signY + 16);
    doc.text(`Ref/UTR: ${claim.payment_reference || "Processed"}`, c3X + 4, signY + 21);
    doc.text(`Paid On: ${formatDateStr(claim.disbursed_at || new Date())}`, c3X + 4, signY + 26);
  } else {
    doc.text(`Audit Status: ${claim.finance_decision || "In Review"}`, c3X + 4, signY + 16);
    doc.text(`Sanctioned: Rs. ${formatPDFAmount(totalApproved)}`, c3X + 4, signY + 21);
  }
  doc.setDrawColor(226, 232, 240);
  doc.line(c3X + 4, signY + 34, c3X + colWidth - 4, signY + 34);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Finance & Accounts Sign-off", c3X + colWidth / 2, signY + 39, { align: "center" });

  // Page Footer
  doc.setLineWidth(0.3);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 280, 190, 280);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Official Corporate Reimbursement Document  •  Zentelex Pvt. Ltd. HR & Finance Desk", 105, 285, { align: "center" });

  doc.save(`Reimbursement_Voucher_${claimNo.replace(/\//g, "_")}_${claim.employee_id || "EMP"}.pdf`);
};
