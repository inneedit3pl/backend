import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

const TEMP_DIR = path.join(__dirname, "../uploads/tmp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

export async function generateExcel(data: any[]) {
  const worksheet = XLSX.utils.json_to_sheet(data);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "WorkHistory");

  const fileId = uuidv4();
  const filePath = path.join(TEMP_DIR, `${fileId}.xlsx`);

  XLSX.writeFile(workbook, filePath);

  return { fileId, filePath };
}
