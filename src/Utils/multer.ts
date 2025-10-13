import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import path from "path";

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (![".xlsx", ".xls", ".csv"].includes(ext)) {
    cb(new Error("Only Excel files (.xlsx, .xls) or CSV are allowed"));
  } else {
    cb(null, true);
  }
};

const upload = multer({ storage, fileFilter });

export default upload;
