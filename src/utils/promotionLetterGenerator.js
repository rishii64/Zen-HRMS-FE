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
 * Generates an official, print-ready PDF Promotion & Grade Progression Letter.
 */
export const generatePromotionLetterPDF = (promotion, company = {}) => {
  const doc = new jsPDF("p", "mm", "a4");
  const compName = company.name || "Zentelex Software & Technology Pvt. Ltd.";
  const compAddress = company.address || "Sector V, Bidhannagar, Kolkata, West Bengal - 700091";
  const compEmail = company.email || "hr@zentelex.com";
  const refNo =
    promotion.letter_ref_no ||
    `ZEN/HR/PRM/${new Date().getFullYear()}/${promotion.id || "001"}`;
  const issueDate = formatDateStr(promotion.letter_issue_date || new Date());
  const effectiveDate = formatDateStr(promotion.effective_date);

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
    `CIN: U72200WB2020PTC239871  |  Official Performance & Grade Advancement Document`,
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
  doc.text(promotion.employee_name || "Employee Name", 20, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Employee Code: ${promotion.employee_id}`, 20, 61);
  doc.text(`Current Designation: ${promotion.current_designation || "Staff"}`, 20, 66);
  doc.text(`Department: ${promotion.department || "General"}`, 20, 71);

  // 4. Subject Line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("SUBJECT: OFFICIAL LETTER OF PROMOTION & SALARY REVISION", 105, 82, {
    align: "center",
  });
  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(20, 85, 190, 85);

  // 5. Salutation & Opening Paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Dear ${promotion.employee_name || "Colleague"},`, 20, 92);

  const openingPara = `On behalf of the Management and Board of Directors of ${compName}, we take immense pleasure in congratulating you on your well-deserved promotion. In recognition of your consistent excellence, high-impact contributions, and proven leadership, the Management is pleased to elevate your role and revise your compensation effective from ${effectiveDate}. Your advanced appointment parameters are detailed below:`;

  const splitOpening = doc.splitTextToSize(openingPara, 170);
  doc.text(splitOpening, 20, 97);

  let currentY = 97 + splitOpening.length * 4.5 + 2;

  // 6. Summary Table
  const tableData = [
    ["Advancement Category", promotion.promotion_type || "Merit Promotion"],
    ["Promoted Designation", promotion.target_designation || "Senior Title"],
    [
      "Job Grade & Progression",
      `${promotion.current_grade_code || "L2"} (Rank ${promotion.current_rank_level || 2}) → ${promotion.target_grade_code || "L3"} (Rank ${promotion.target_rank_level || 3})`,
    ],
    ["Department / Vertical", promotion.department || "General"],
    ["Effective Date", effectiveDate],
    [
      "Performance Benchmark",
      promotion.performance_rating || "Exceeds Expectations",
    ],
    [
      "Previous Annual CTC",
      promotion.current_salary > 0
        ? formatPDFINR(promotion.current_salary)
        : "Confidential",
    ],
    [
      "Revised Annual CTC",
      formatPDFINR(promotion.revised_salary),
    ],
    [
      "Increment Hike",
      `${formatPDFINR(promotion.increment_amount)} (+${parseFloat(promotion.increment_percentage || 0).toFixed(1)}%)`,
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 20, right: 20 },
    theme: "grid",
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 65, fillColor: [248, 250, 252] },
      1: { cellWidth: 105 },
    },
    body: tableData,
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // 7. Terms & Professional Expectations
  const clauses = [
    {
      title: "1. Expanded Roles & Accountability",
      body: `With this advancement to ${promotion.target_designation}, you are expected to take full ownership of strategic initiatives, provide inspirational leadership to your team, and contribute actively to organizational roadmap objectives.`,
    },
    {
      title: "2. Compensation & Benefits Structure",
      body: `Your revised compensation of ${formatPDFINR(promotion.revised_salary)} per annum will take effect from ${effectiveDate} and be disbursed in accordance with standard corporate payroll timelines and statutory deductions.`,
    },
    {
      title: "3. Service Continuity & Code of Conduct",
      body: "All other employment terms, non-disclosure covenants, and service continuity agreements remain in full force. We are confident you will continue to uphold the highest benchmarks of innovation and integrity.",
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
  doc.text(
    "We congratulate you once again and wish you continued triumph and fulfillment in your career with us.",
    20,
    currentY
  );
  currentY += 8;

  doc.text("Yours sincerely,", 20, currentY);
  doc.setFont("helvetica", "bold");
  doc.text(`For ${compName}`, 20, currentY + 5);

  currentY += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(promotion.letter_signatory_name || "Priyanka Mukherjee", 20, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    promotion.letter_signatory_title || "CHRO & VP - Human Resources",
    20,
    currentY + 4.5
  );

  // Employee Acceptance Acknowledgement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Employee Acceptance:", 130, currentY - 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature: _______________________", 130, currentY);
  doc.text(`Name: ${promotion.employee_name || "Employee"}`, 130, currentY + 4.5);
  doc.text("Date:    _______________________", 130, currentY + 9);

  // Footer bar
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 287, 210, 10, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Zentelex HRMS • Confidential Promotion Record • Order Ref: ${refNo} • Generated on ${new Date().toLocaleDateString()}`,
    105,
    293,
    { align: "center" }
  );

  return doc;
};

