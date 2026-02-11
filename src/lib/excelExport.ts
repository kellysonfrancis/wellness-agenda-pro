import ExcelJS from "exceljs";

/**
 * Shared helper to create and download an Excel workbook.
 * Replaces the vulnerable `xlsx` package.
 */
export async function createAndDownloadExcel(
  sheets: { name: string; data: (string | number | null | undefined)[][] }[],
  filename: string
) {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    for (const row of sheet.data) {
      ws.addRow(row);
    }
    // Bold header row
    if (sheet.data.length > 0) {
      ws.getRow(1).font = { bold: true };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Simple helper: export an array of objects as a single-sheet Excel file.
 */
export async function exportJsonToExcel(
  data: Record<string, unknown>[],
  sheetName: string,
  filename: string
) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows: (string | number | null | undefined)[][] = [
    headers,
    ...data.map((row) => headers.map((h) => row[h] as string | number | null)),
  ];
  await createAndDownloadExcel([{ name: sheetName, data: rows }], filename);
}
