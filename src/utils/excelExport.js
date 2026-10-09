import XLSX from "xlsx-js-style";

/**
 * Common typography & style presets for Excel exports
 */
const BOLD_HEADER_FONT = {
  name: "Calibri",
  sz: 11,
  bold: true,
  color: { rgb: "000000" },
};

const TABLE_HEADER_STYLE = {
  font: BOLD_HEADER_FONT,
  // fill: {
  //   fgColor: { rgb: "F1F5F9" }, // Slate-100 soft header background
  // },
  alignment: {
    vertical: "center",
    horizontal: "center",
    wrapText: true,
  },
  // border: {
  //   top: { style: "thin", color: { rgb: "CBD5E1" } },
  //   bottom: { style: "medium", color: { rgb: "64748B" } }, // distinct baseline
  //   left: { style: "thin", color: { rgb: "E2E8F0" } },
  //   right: { style: "thin", color: { rgb: "E2E8F0" } },
  // },
};

const SECTION_BAR_STYLE = {
  font: {
    name: "Calibri",
    sz: 11,
    bold: true,
    color: { rgb: "0F172A" },
  },
  fill: {
    fgColor: { rgb: "E2E8F0" }, // Slate-200 distinct section bar
  },
  alignment: {
    vertical: "center",
    horizontal: "left",
  },
  // border: {
  //   top: { style: "thin", color: { rgb: "94A3B8" } },
  //   bottom: { style: "thin", color: { rgb: "94A3B8" } },
  // },
};

const MAIN_TITLE_STYLE = {
  font: {
    name: "Calibri",
    sz: 13,
    bold: true,
    color: { rgb: "0F172A" },
  },
  alignment: {
    vertical: "center",
    horizontal: "left",
  },
};

const SUBTITLE_STYLE = {
  font: {
    name: "Calibri",
    sz: 11,
    bold: true,
    color: { rgb: "334155" },
  },
  alignment: {
    vertical: "center",
    horizontal: "left",
  },
};

const LABEL_STYLE = {
  font: {
    name: "Calibri",
    sz: 10,
    bold: true,
    color: { rgb: "1E293B" },
  },
  alignment: {
    vertical: "center",
    horizontal: "left",
  },
};

const TOTAL_STYLE = {
  font: {
    name: "Calibri",
    sz: 11,
    bold: true,
    color: { rgb: "0F172A" },
  },
  fill: {
    fgColor: { rgb: "FEF3C7" }, // Soft amber highlight for totals
  },
  alignment: {
    vertical: "center",
    horizontal: "left",
  },
  // border: {
  //   top: { style: "thin", color: { rgb: "F59E0B" } },
  //   bottom: { style: "medium", color: { rgb: "D97706" } },
  // },
};

const DATA_CELL_STYLE = {
  font: {
    name: "Calibri",
    sz: 10,
    color: { rgb: "1E293B" },
  },
  alignment: {
    vertical: "center",
  },
  // border: {
  //   top: { style: "thin", color: { rgb: "F1F5F9" } },
  //   bottom: { style: "thin", color: { rgb: "E2E8F0" } },
  //   left: { style: "thin", color: { rgb: "F8FAFC" } },
  //   right: { style: "thin", color: { rgb: "F8FAFC" } },
  // },
};

const SECTION_KEYWORDS = [
  "EMPLOYEE DETAILS",
  "COMPENSATION & STATUS",
  "ATTENDANCE SUMMARY",
  "EARNINGS (FIXED STRUCTURE)",
  "DEDUCTIONS & COMPLIANCE",
  "SALARY COMPUTATION",
  "SALARY PAYABLE",
  "AMOUNT (INR)",
  "LOCATION:",
  "COMPANY:",
  "DISBURSEMENT REGISTER",
];

function isSectionTitle(str) {
  if (!str || typeof str !== "string") return false;
  const upper = str.trim().toUpperCase();
  return SECTION_KEYWORDS.some((kw) => upper.includes(kw));
}

function isLabelCell(str) {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  if (trimmed.endsWith(":")) return true;
  const upper = trimmed.toUpperCase();
  return [
    "EMPLOYEE ID",
    "EMPLOYEE NAME",
    "DESIGNATION",
    "DEPARTMENT",
    "EMPLOYEE STATUS",
    "EMPLOYMENT TYPE",
    "PAY PERIOD",
    "PAY STATUS",
    "BANK NAME",
    "ACCOUNT NO",
    "IFSC CODE",
    "PAN NUMBER",
    "BASIC SALARY",
    "HOUSE RENT ALLOWANCE",
    "CONVEYANCE ALLOWANCE",
    "MEDICAL ALLOWANCE",
    "SPECIAL ALLOWANCE",
    "PROVIDENT FUND",
    "PROFESSIONAL TAX",
    "INCOME TAX",
    "LOSS OF PAY",
  ].some((l) => upper === l || upper === `${l}:`);
}

function isTotalCell(str) {
  if (!str || typeof str !== "string") return false;
  const upper = str.trim().toUpperCase();
  return (
    upper.includes("NET SALARY PAYABLE") ||
    upper.includes("TOTAL GROSS") ||
    upper.includes("TOTAL DEDUCTIONS") ||
    upper.includes("SUBTOTAL") ||
    upper.includes("GRAND TOTAL") ||
    upper.startsWith("GRAND TOTAL") ||
    upper.startsWith("TOTAL:") ||
    upper === "TOTAL"
  );
}

/**
 * Apply rich bold styling to worksheets
 */
function applyWorksheetStyles(ws, isAOA, data) {
  if (!ws || !ws["!ref"]) return;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  if (!ws["!rows"]) ws["!rows"] = [];

  if (!isAOA) {
    // Array of objects -> Row 0 (r = 0) is the table header row
    ws["!rows"][0] = { hpt: 26 };
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: range.s.r, c });
      if (ws[cellRef]) {
        ws[cellRef].s = TABLE_HEADER_STYLE;
      }
    }

    // Data rows
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      ws["!rows"][r] = { hpt: 20 };
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          const val = ws[cellRef].v;
          const isNum = typeof val === "number";
          ws[cellRef].s = {
            ...DATA_CELL_STYLE,
            alignment: {
              vertical: "center",
              horizontal: isNum ? "right" : "left",
            },
          };
        }
      }
    }
    return;
  }

  // If isAOA:
  // Determine if it is a standard table (row 0 has multiple headers) or a formatted document (payslip)
  const isSimpleTable =
    Array.isArray(data[0]) &&
    data[0].length > 1 &&
    Array.isArray(data[1]) &&
    data.length > 1 &&
    data[0].every((v) => typeof v === "string" && v.trim().length > 0 && !v.endsWith(":"));

  if (isSimpleTable) {
    // Row 0 is the table header row
    ws["!rows"][0] = { hpt: 26 };
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[cellRef]) {
        ws[cellRef].s = TABLE_HEADER_STYLE;
      }
    }

    for (let r = 1; r <= range.e.r; r++) {
      ws["!rows"][r] = { hpt: 20 };
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          const val = ws[cellRef].v;
          const isNum = typeof val === "number";
          ws[cellRef].s = {
            ...DATA_CELL_STYLE,
            alignment: {
              vertical: "center",
              horizontal: isNum ? "right" : "left",
            },
          };
        }
      }
    }
    return;
  }

  // Formatted document (e.g. Payslip)
  for (let r = range.s.r; r <= range.e.r; r++) {
    ws["!rows"][r] = { hpt: 21 };

    let isRowSection = false;
    let isRowTotal = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      if (cell && cell.v != null) {
        const str = String(cell.v).trim();
        if (isSectionTitle(str)) isRowSection = true;
        if (isTotalCell(str)) isRowTotal = true;
      }
    }

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      if (!cell || cell.v == null || cell.v === "") continue;

      const str = String(cell.v).trim();

      // Top company title
      if (r === 0) {
        cell.s = MAIN_TITLE_STYLE;
        ws["!rows"][r] = { hpt: 26 };
      } else if (str.toUpperCase().includes("SALARY PAYSLIP FOR")) {
        cell.s = SUBTITLE_STYLE;
        ws["!rows"][r] = { hpt: 22 };
      } else if (isRowSection || isSectionTitle(str)) {
        cell.s = SECTION_BAR_STYLE;
        ws["!rows"][r] = { hpt: 23 };
      } else if (isRowTotal || isTotalCell(str)) {
        cell.s = TOTAL_STYLE;
        ws["!rows"][r] = { hpt: 24 };
      } else if (isLabelCell(str)) {
        cell.s = LABEL_STYLE;
      } else {
        const isNum = typeof cell.v === "number";
        cell.s = {
          ...DATA_CELL_STYLE,
          alignment: {
            vertical: "center",
            horizontal: isNum ? "right" : "left",
          },
        };
      }
    }
  }
}

/**
 * Utility to export tabular data to a native Microsoft Excel (.xlsx) file with bold styled headers.
 *
 * @param {Object} options
 * @param {Array<Array<any>>|Array<Object>} options.data - 2D Array of rows or Array of row objects
 * @param {string} options.fileName - Target filename (with or without .xlsx extension)
 * @param {string} [options.sheetName="Report"] - Name for the worksheet
 * @param {Array<{wch: number}>} [options.colWidths] - Optional manual column widths
 */
export function exportToExcel({
  data = [],
  fileName = "export.xlsx",
  sheetName = "Report",
  colWidths = null,
}) {
  if (!data || data.length === 0) {
    console.warn("exportToExcel: No data to export");
    return;
  }

  // Create empty workbook
  const wb = XLSX.utils.book_new();

  // Create worksheet from 2D Array or Object list
  let ws;
  const isAOA = Array.isArray(data[0]);
  if (isAOA) {
    ws = XLSX.utils.aoa_to_sheet(data);
  } else {
    ws = XLSX.utils.json_to_sheet(data);
  }

  // Calculate dynamic column widths if not explicitly provided
  if (colWidths && Array.isArray(colWidths)) {
    ws["!cols"] = colWidths;
  } else {
    // Auto-fit column widths
    const calculatedWidths = [];
    if (isAOA) {
      data.forEach((row) => {
        // Skip full-width header/title rows when calculating column widths to avoid overstretching
        if (row.length <= 1) return;
        row.forEach((val, colIdx) => {
          const strVal = val != null ? String(val) : "";
          const curMax = calculatedWidths[colIdx] || 12;
          calculatedWidths[colIdx] = Math.max(curMax, strVal.length + 3);
        });
      });
    } else {
      const keys = Object.keys(data[0] || {});
      keys.forEach((key, colIdx) => {
        let maxLen = key.length + 3;
        data.forEach((row) => {
          const strVal = row[key] != null ? String(row[key]) : "";
          if (strVal.length + 3 > maxLen) {
            maxLen = strVal.length + 3;
          }
        });
        calculatedWidths[colIdx] = Math.max(14, maxLen);
      });
    }

    ws["!cols"] = calculatedWidths.map((w) => ({ wch: Math.min(Math.max(w || 14, 12), 48) }));
  }

  // Apply bold headers & section styling
  applyWorksheetStyles(ws, isAOA, data);

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  // Ensure safe .xlsx filename
  const cleanName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;

  // Write and trigger browser download
  try {
    XLSX.writeFile(wb, cleanName);
  } catch (err) {
    console.warn("XLSX.writeFile failed, falling back to manual blob download:", err);
    try {
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (fallbackErr) {
      console.error("Failed to download Excel file:", fallbackErr);
    }
  }
}

export default exportToExcel;
