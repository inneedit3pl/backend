import { NextFunction, Request, Response, Router } from "express";
import { IVehicle } from "../models/vehicle";
import { MongooseService } from "../mongoSetup";
import Config from "../config";
import xlsx from "xlsx";
import upload from "../Utils/multer";
import { parseDate } from "../Utils/helper";
import { verifyToken } from "../Utils/Jwt";
const DB_COLLECTIONS = Config.DB_COLLECTIONS;
const vehicleRouter = Router();
const service = new MongooseService();

vehicleRouter.post(
  "/bulk",
  verifyToken,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ status: false, message: "File required" });
      }

      let workbook;
      if (req.file.originalname.endsWith(".csv")) {
        workbook = xlsx.read(req.file.buffer.toString(), { type: "string" });
      } else {
        workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = xlsx.utils.sheet_to_json(sheet);

      const vehicles: Partial<IVehicle>[] = rows.map((row) => ({
        modelName: row["Model"],
        registrationNo: row["Registration No"],
        uid: row["UID"],
        motorNo: row["Motor Number"],
        chassisNo: row["Chassis Number"],
        imei: row["IMEI Number"],
        purchaseDate: parseDate(row["Purchase Date"]),
        warrantyStartDate: parseDate(row["Warranty Start Date"]),
        warrantyEndDate: parseDate(row["Warranty End Date"]),
      }));

      let success: IVehicle[] = [];
      let failed: { row: any; error: string }[] = [];

      try {
        success = await service.insertMany<IVehicle>(
          DB_COLLECTIONS.vehicles,
          vehicles,
          { ordered: false }
        );
      } catch (err: any) {
        if (err.insertedDocs) {
          success = err.insertedDocs;
        }

        // Handle bulk write errors
        if (err.writeErrors || err.result?.result?.writeErrors) {
          const writeErrors = err.writeErrors || err.result.result.writeErrors;

          failed = writeErrors.map((e: any) => ({
            row: vehicles[e.index],
            error: e.errmsg || e.err?.message || "Duplicate entry",
          }));
        }

        // Handle single duplicate key error (code 11000)
        if (err.code === 11000) {
          failed.push({
            row: vehicles[0], // or the conflicting row
            error: "Duplicate entry for a unique field",
          });
        }
      }

      return res.status(200).json({
        status: true,
        message: "Bulk upload processed",
        successCount: success.length,
        failureCount: failed.length,
        success,
        failed,
      });
    } catch (error) {
      next(error);
    }
  }
);

vehicleRouter.get(
  "/vehicle-options",
  verifyToken,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const vehicles = await service.find<IVehicle>(DB_COLLECTIONS.vehicles);
      const formatted = vehicles.map((vehicle: any) => ({
        id: vehicle?.id,
        uid: vehicle?.uid,
      }));
      return res.status(200).json({
        status: true,
        message: "Vehicles fetched successfully",
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }
);

vehicleRouter.post(
  "/",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        modelName,
        registrationNo,
        uid,
        motorNo,
        chassisNo,
        imei,
        purchaseDate,
        warrantyStartDate,
        warrantyEndDate,
      } = req.body as IVehicle;

      if (!modelName || !uid || !imei) {
        return res.status(400).json({
          status: false,
          message: "Required fields missing",
        });
      }

      const vehicle = await service.create<IVehicle>(DB_COLLECTIONS.vehicles, {
        modelName,
        registrationNo,
        uid,
        motorNo,
        chassisNo,
        imei,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        warrantyStartDate: warrantyStartDate
          ? new Date(warrantyStartDate)
          : undefined,
        warrantyEndDate: warrantyEndDate
          ? new Date(warrantyEndDate)
          : undefined,
      });

      return res.status(201).json({
        status: true,
        message: "Vehicle created successfully",
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  }
);

vehicleRouter.get(
  "/by-client/:clientId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.params;
      const data = await service.find(
        DB_COLLECTIONS.vehicles,
        { clientId: clientId },
        {},
        {},
        [{ path: "riderId", select: "fullName" }]
      );
      return res.status(200).json({ status: true, message: "success", data });
    } catch (error) {
      next(error);
    }
  }
);

vehicleRouter.get(
  "/",
  verifyToken,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const vehicles = await service.find<IVehicle>(
        DB_COLLECTIONS.vehicles,
        {},
        {},
        {},
        [
          { path: "riderId", select: "fullName" },
          { path: "clientId", select: "name" },
        ]
      );
      const formatted = vehicles.map((vehicle: any) => ({
        id: vehicle?.id,
        modelName: vehicle?.modelName,
        registrationNo: vehicle?.registrationNo,
        uid: vehicle?.uid,
        motorNo: vehicle?.motorNo,
        chassisNo: vehicle?.chassisNo,
        imei: vehicle?.imei,
        purchaseDate: vehicle?.purchaseDate,
        warrantyStartDate: vehicle?.warrantyStartDate,
        warrantyEndDate: vehicle?.warrantyEndDate,
        status: vehicle?.status,
        riderName: vehicle?.riderId?.fullName || null,
        clientName: vehicle?.clientId?.name || null,
      }));
      return res.status(200).json({
        status: true,
        message: "Vehicles fetched successfully",
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }
);

vehicleRouter.get(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const vehicle = await service.findOne<IVehicle>(
        DB_COLLECTIONS.vehicles,
        { _id: id },
        {},
        {},
        [
          { path: "riderId", select: "name" },
          { path: "clientId", select: "name" },
        ]
      );

      if (!vehicle) {
        return res.status(404).json({
          status: false,
          message: "Vehicle not found",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Vehicle fetched successfully",
        data: {
          ...vehicle,
          riderName: (vehicle as any).riderId?.name || null,
          clientName: (vehicle as any).clientId?.name || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

vehicleRouter.put(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.purchaseDate)
        updateData.purchaseDate = new Date(updateData.purchaseDate);
      if (updateData.warrantyStartDate)
        updateData.warrantyStartDate = new Date(updateData.warrantyStartDate);
      if (updateData.warrantyEndDate)
        updateData.warrantyEndDate = new Date(updateData.warrantyEndDate);

      const updatedVehicle = await service.updateOne<IVehicle>(
        DB_COLLECTIONS.vehicles,
        { _id: id },
        updateData
      );

      if (!updatedVehicle) {
        return res.status(404).json({
          status: false,
          message: "Vehicle not found",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Vehicle updated successfully",
        data: updatedVehicle,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default vehicleRouter;
