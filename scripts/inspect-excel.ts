import * as XLSX from "xlsx";

const workbook = XLSX.readFile("C:/Users/User/Downloads/2-1.xlsx");
console.log("Sheet names:", workbook.SheetNames);

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Raw rows (array of arrays)
const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log("Total raw rows:", rawData.length);
console.log("First 10 rows:");
rawData.slice(0, 15).forEach((row, idx) => {
  console.log(`Row ${idx + 1}:`, JSON.stringify(row));
});
