import * as XLSX from "xlsx";

export function exportToExcel(dataRows: any[][], headers: string[], sheetName: string, fileName: string) {
  const wb = XLSX.utils.book_new();
  
  // Create header rows with university logo branding
  const headerData = [
    ["🏫 SYMBIOSIS UNIVERSITY OF APPLIED SCIENCES, INDORE"],
    ["School of Computer Science & Information Technology (SCSIT)"],
    ["SCSIT LabOS — Official Digital Laboratory Register & Inventory Archive"],
    [`Generated: ${new Date().toLocaleString("en-IN")} | Secure Digital Record File`],
    [], // Spacer row
    headers,
    ...dataRows
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerData);

  // Set merge for top branding titles to span the entire table width
  const maxCols = Math.max(headers.length, 6);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: maxCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: maxCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: maxCols - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: maxCols - 1 } }
  ];

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}_${Date.now()}.xlsx`);
}
