import * as XLSX from "xlsx";

/**
 * Utility to export tabular data to a native Microsoft Excel (.xlsx) file.
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
        row.forEach((val, colIdx) => {
          const strVal = val != null ? String(val) : "";
          const curMax = calculatedWidths[colIdx] || 10;
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
        calculatedWidths[colIdx] = Math.max(12, maxLen);
      });
    }

    ws["!cols"] = calculatedWidths.map((w) => ({ wch: Math.min(w, 50) }));
  }

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  // Ensure safe .xlsx filename
  const cleanName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;

  // Write and trigger browser download
  XLSX.writeFile(wb, cleanName);
}

export default exportToExcel;
