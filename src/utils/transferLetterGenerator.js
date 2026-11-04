import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const formatINR = (val) => {
  const num = parseFloat(val) || 0;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatPDFINR = (val) => {
  const num = parseFloat(val) || 0;
  return "Rs. " + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatDateStr = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return String(d);
  }
};

/**
 * Generates an official, print-ready PDF Transfer / Deputation Letter.
 */
export const generateTransferLetterPDF = (transfer, company = {}) => {
  const doc = new jsPDF("p", "mm", "a4");
  const compName = company.name || "Zentelex Software & Technology Pvt. Ltd.";
  const compAddress = company.address || "Sector V, Bidhannagar, Kolkata, West Bengal - 700091";
  const compEmail = company.email || "hr@zentelex.com";
  const refNo = transfer.letter_ref_no || `ZEN/HR/TRF/${new Date().getFullYear()}/${transfer.id || "001"}`;
  const issueDate = formatDateStr(transfer.letter_issue_date || new Date());
  const effectiveDate = formatDateStr(transfer.effective_date);
  const isDeputation = transfer.transfer_type === "Deputation";

  // 1. Corporate Header Banner (Slate Navy)
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(compName, 105, 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`${compAddress}  |  Email: ${compEmail}`, 105, 21, { align: "center" });
  doc.text(
    `CIN: U72200WB2020PTC239871  |  Official Service & Lifecycle Document`,
    105,
    26,
    { align: "center" }
  );

  // 2. Reference & Date
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Ref No: ${refNo}`, 20, 42);
  doc.text(`Date of Issue: ${issueDate}`, 190, 42, { align: "right" });

  // 3. Recipient Particulars
  doc.setFontSize(9.5);
  doc.text("To,", 20, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(transfer.employee_name || "Employee Name", 20, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Employee Code: ${transfer.employee_id}`, 20, 61);
  doc.text(`Current Designation: ${transfer.current_designation || "Staff"}`, 20, 66);
  doc.text(`Current Department: ${transfer.current_department || "General"}`, 20, 71);
  doc.text(`Current Base: ${transfer.current_branch || "Kolkata HQ"}`, 20, 76);

  // 4. Subject Line
  const subjectText = isDeputation
    ? "SUBJECT: OFFICIAL ORDER OF DEPUTATION & ASSIGNMENT PROTOCOL"
    : `SUBJECT: OFFICIAL LETTER OF ${String(transfer.transfer_type || "TRANSFER").toUpperCase()} & RE-ASSIGNMENT`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(subjectText, 105, 86, { align: "center" });
  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(20, 89, 190, 89);

  // 5. Salutation & Opening Paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Dear ${transfer.employee_name || "Colleague"},`, 20, 96);

  const openingPara = isDeputation
    ? `We are pleased to inform you that in view of strategic requirements, you are being placed on Deputation to ${transfer.target_department || "the designated unit"} at ${transfer.target_branch || "the specified location"}, effective from ${effectiveDate}. Your deputation terms and conditions are summarized below:`
    : `In accordance with the organization's operational alignment and business growth plans, the Management is pleased to confirm your ${transfer.transfer_type} to ${transfer.target_department || "the target unit"} at ${transfer.target_branch || "the target branch"}, with effect from ${effectiveDate}. The terms of your transfer are set forth below:`;

  const splitOpening = doc.splitTextToSize(openingPara, 170);
  doc.text(splitOpening, 20, 101);

  let currentY = 101 + splitOpening.length * 4.5 + 2;

  // 6. Summary Table
  const tableData = [
    ["Transfer / Deputation Type", transfer.transfer_type || "Inter-Departmental"],
    ["Effective Date", effectiveDate],
    ["Target Department", transfer.target_department || "—"],
    ["Designation / Role", transfer.target_designation || transfer.current_designation || "—"],
    ["Assigned Location / Branch", transfer.target_branch || "—"],
    ["Reporting Manager", transfer.target_reporting_manager || "—"],
  ];

  if (isDeputation) {
    if (transfer.deputation_start_date && transfer.deputation_end_date) {
      tableData.push([
        "Deputation Tenure",
        `${formatDateStr(transfer.deputation_start_date)} to ${formatDateStr(transfer.deputation_end_date)}`,
      ]);
    }
    if (parseFloat(transfer.deputation_allowance) > 0) {
      tableData.push(["Monthly Deputation Allowance", formatPDFINR(transfer.deputation_allowance)]);
    }
  }

  if (parseFloat(transfer.relocation_allowance) > 0) {
    tableData.push(["One-Time Relocation Allowance", formatPDFINR(transfer.relocation_allowance)]);
  }

  if (parseFloat(transfer.revised_salary) > 0 && parseFloat(transfer.revised_salary) !== parseFloat(transfer.current_salary)) {
    tableData.push(["Revised Annual CTC", formatPDFINR(transfer.revised_salary)]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: 20, right: 20 },
    theme: "grid",
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 65, fillColor: [248, 250, 252] },
      1: { cellWidth: 105 },
    },
    body: tableData,
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // 7. Terms & Conditions Paragraphs
  const clauses = [
    {
      title: "1. Roles & Core Responsibilities",
      body: `You are expected to perform the duties and assume the accountabilities associated with your new assignment. You will be reporting directly to ${transfer.target_reporting_manager || "your designated Department Head"}.`,
    },
    {
      title: "2. Handover & Asset Reconciliation",
      body: "Prior to joining your new location/department, you must complete full handover of all ongoing tasks, project repositories, keys, physical assets, and client documents to your current manager.",
    },
    {
      title: isDeputation ? "3. Repatriation & Tenure Protocol" : "3. Continuity of Service",
      body: isDeputation
        ? "Upon conclusion of the specified deputation period, you will revert to your substantive parent department or as otherwise determined by Management."
        : "All accrued employee benefits, seniority, leave balances, and service continuity remain fully intact and unaltered by this transfer.",
    },
  ];

  clauses.forEach((cl) => {
    if (currentY > 245) {
      doc.addPage();
      currentY = 25;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cl.title, 20, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitBody = doc.splitTextToSize(cl.body, 170);
    doc.text(splitBody, 20, currentY);
    currentY += splitBody.length * 3.8 + 2.5;
  });

  // 8. Closing & Signature Area
  if (currentY > 235) {
    doc.addPage();
    currentY = 30;
  } else {
    currentY = Math.max(currentY + 4, 235);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("We wish you the very best in your new responsibilities and look forward to your continued contribution.", 20, currentY);
  currentY += 8;

  doc.text("Yours sincerely,", 20, currentY);
  doc.setFont("helvetica", "bold");
  doc.text(`For ${compName}`, 20, currentY + 5);

  // Signatory
  currentY += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(transfer.letter_signatory_name || "Priyanka Mukherjee", 20, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(transfer.letter_signatory_title || "CHRO & VP - Human Resources", 20, currentY + 4.5);

  // Employee Acceptance Acknowledgement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Employee Acceptance:", 130, currentY - 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature: _______________________", 130, currentY);
  doc.text(`Name: ${transfer.employee_name || "Employee"}`, 130, currentY + 4.5);
  doc.text("Date:    _______________________", 130, currentY + 9);

  // Footer bar
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 287, 210, 10, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Zentelex HRMS • Confidential Corporate Document • Transfer Ref: ${refNo} • Generated on ${new Date().toLocaleDateString()}`,
    105,
    293,
    { align: "center" }
  );

  return doc;
};

