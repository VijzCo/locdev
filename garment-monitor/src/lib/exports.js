// src/lib/exports.js
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Export an array of objects to .xlsx.
 * @param {Array<Object>} rows
 * @param {Array<{key,label}>} columns
 * @param {string} filename  without extension
 */
export function exportExcel(rows, columns, filename = "report") {
  const data = rows.map((r) =>
    Object.fromEntries(columns.map((c) => [c.label, r[c.key] ?? ""]))
  );
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Export to a print-friendly PDF table. */
export function exportPDF(rows, columns, { filename = "report", title = "Report", meta = "" } = {}) {
  const docp = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });
  docp.setFontSize(14);
  docp.text(title, 14, 16);
  if (meta) { docp.setFontSize(9); docp.setTextColor(120); docp.text(meta, 14, 22); }
  autoTable(docp, {
    startY: meta ? 26 : 22,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [248, 250, 252] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });
  docp.save(`${filename}.pdf`);
}
