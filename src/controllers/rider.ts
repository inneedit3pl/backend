import { NextFunction, Request, Response, Router } from "express";
import { MongooseService, toObjectId } from "../mongoSetup";
import Config from "../config";
import { verifyToken } from "../Utils/Jwt";
import uploadImage from "../Utils/multer2";
import fs from "fs";
import path from "path";
import { generateExcel } from "../Utils/generateExcel";
import upload from "../Utils/multer";
import xlsx from "xlsx";
import { sendIciciPayment } from "../Utils/iciciService";
import axios from "axios";

const DB_COLLECTIONS = Config.DB_COLLECTIONS;
const riderRouter = Router();
const service = new MongooseService();

riderRouter.get(
  "/generatePayouts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
axios.get("https://apibankingonesandbox.icicibank.com/api/v1/health", {
  headers: { "x-api-key": "MVcF4C4SGG9tto2dyqjjdHLlFTAYuAhf" }
})
.then(r => console.log(r.status))
.catch(e => console.log(e.response?.status, e.response?.data));

      // const user = {
      //   amountToPay: 10,
      //   _id: "123456",
      //   bankDetails: {
      //     accountNo: "",
      //     ifsc: "",
      //     accountName: "",
      //   },
      // };
      // const response = await sendIciciPayment(user);
      // console.log(response, "response");
      return res
        .status(200)
        // .json({ status: true, message: "success", data: response });
    } catch (error) {
      next(error);
    }
  }
);

riderRouter.post(
  "/",
  uploadImage.fields([
    { name: "aadhaar", maxCount: 1 },
    { name: "pan", maxCount: 1 },
    { name: "license", maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        mobile,
        fullName,
        altMobile,
        currentAddress,
        bankName,
        accountName,
        accountNo,
        ifsc,
      } = req.body;
      let { emergencyContacts } = req.body;

      if (emergencyContacts && typeof emergencyContacts === "string") {
        emergencyContacts = JSON.parse(emergencyContacts);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      const aadhaarFile = files?.aadhaar?.[0];
      const panFile = files?.pan?.[0];
      const licenseFile = files?.license?.[0];

      const kycDocuments = {
        aadhaar: aadhaarFile ? aadhaarFile.filename : "",
        pan: panFile ? panFile.filename : "",
        license: licenseFile ? licenseFile.filename : "",
      };

      const isKyc = {
        aadhaar: !!aadhaarFile,
        pan: !!panFile,
        license: !!licenseFile,
      };

      const rider = await service.create(DB_COLLECTIONS.riders, {
        mobile,
        fullName,
        altMobile,
        currentAddress,
        kycDocuments,
        isKyc,
        emergencyContacts,
        bankDetails: {
          bankName,
          accountName,
          accountNo,
          ifsc,
        },
      });
      res.status(201).json({
        status: true,
        message: "Rider created successfully",
        data: rider,
      });
    } catch (error) {
      next(error);
    }
  }
);

riderRouter.put(
  "/assign/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const {
        clientId,
        isOwnVehicle,
        vehicleId,
        vehicleUid,
        store,
        registeredId,
      } = req.body;

      const isDuplicateRegisteredId = await service.findOne(
        DB_COLLECTIONS.workHistory,
        { registeredId }
      );
      if (isDuplicateRegisteredId)
        return res
          .status(400)
          .json({ status: false, message: "duplicate clientRiderId found" });
      // Find rider first
      const isRiderInactive = (await service.findOne(
        DB_COLLECTIONS.riders,
        {
          _id: id,
        },
        { status: 1, isKyc: 1, mobile: 1 }
      )) as any;

      if (!isRiderInactive) {
        return res.status(404).json({
          success: false,
          message: "Rider not found",
        });
      }
      if (isRiderInactive.status === "active") {
        return res.status(400).json({
          status: false,
          message: "Rider was already in active.",
        });
      }

      if (
        isRiderInactive.isKyc.aadhaar !== true ||
        isRiderInactive.isKyc.pan !== true ||
        isRiderInactive.isKyc.license !== true
      )
        return res
          .status(400)
          .json({ status: false, message: "rider kyc is Pending" });

      if (vehicleId && isOwnVehicle === false) {
        const isVehicleAvailable = (await service.findOne(
          DB_COLLECTIONS.vehicles,
          { _id: vehicleId },
          { status: 1 }
        )) as any;
        if (isVehicleAvailable.status === "ASSIGNED")
          return res.status(400).json({
            status: false,
            message: "Vehicle already Assigned to a rider",
          });

        await service.updateOne(
          DB_COLLECTIONS.vehicles,
          { _id: vehicleId },
          { status: "ASSIGNED", riderId: id, clientId: clientId }
        );
      }
      const rider = await service.updateOne(
        DB_COLLECTIONS.riders,
        { _id: id },
        {
          clientId,
          isOwnVehicle,
          vehicleId,
          vehicleUid,
          store,
          registeredId,
          ActiveDate: new Date(),
          status: "active",
        }
      );
      await service.create(DB_COLLECTIONS.workHistory, {
        riderId: id,
        mobile: isRiderInactive?.mobile,
        fromDate: new Date(),
        clientId,
        registeredId,
        isOwnVehicle,
        vehicleId,
        vehicleUid,
        store,
      });

      res.json({
        status: true,
        message: "Rider updated with client assignment",
        data: rider,
      });
    } catch (error) {
      next(error);
    }
  }
);

riderRouter.put(
  "/deassign/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Find rider first
      const rider = (await service.findOne(DB_COLLECTIONS.riders, {
        _id: id,
      })) as any;
      if (!rider) {
        return res.status(404).json({
          status: false,
          message: "Rider not found",
        });
      }
      if (rider.status !== "active")
        return res
          .status(400)
          .json({ status: false, message: "rider was in-active." });
      const { vehicleId } = rider;

      // 1. Update rider → unset assignment fields
      const updatedRider = await service.updateOne(
        DB_COLLECTIONS.riders,
        { _id: id },
        {
          $unset: {
            clientId: 1,
            isOwnVehicle: 1,
            vehicleId: 1,
            vehicleUid: 1,
            store: 1,
            registeredId: 1,
            ActiveDate: 1,
          },
          $set: {
            status: "inactive",
          },
        }
      );

      // 2. If vehicle was linked, mark as AVAILABLE again
      if (vehicleId) {
        await service.updateOne(
          DB_COLLECTIONS.vehicles,
          { _id: vehicleId },
          {
            $unset: { riderId: 1, clientId: 1 },
            $set: { status: "AVAILABLE" },
          }
        );
      }

      await service.updateOne(
        DB_COLLECTIONS.workHistory,
        {
          riderId: id,
          status: 0,
        },
        { toDate: new Date(), status: 1 }
      );
      res.json({
        success: true,
        message: "Rider de-assigned successfully",
        data: updatedRider,
      });
    } catch (error) {
      next(error);
    }
  }
);
riderRouter.get(
  "/by-client/:clientId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.params;
      const data = await service.find(
        DB_COLLECTIONS.riders,
        { clientId: clientId },
        {
          fullName: 1,
          mobile: 1,
          isOwnVehicle: 1,
          vehicleId: 1,
          vehicleUid: 1,
          store: 1,
          registeredId: 1,
          ActiveDate: 1,
        }
      );
      return res.status(200).json({ status: true, message: "success", data });
    } catch (error) {
      next(error);
    }
  }
);
riderRouter.get(
  "/payouts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await service.find(
        DB_COLLECTIONS.payouts,
        { status: 0 },
        {},
        {},
        [{ path: "clientId", select: "name" }]
      );

      const formatted = data.map((item) => ({
        id: item?.id,
        clientName: item?.clientId?.name,
        registeredId: item?.registeredId,
        mobile: item?.mobile,
        no_Of_Days: item?.no_Of_Days,
        no_Of_Orders: item?.no_Of_Orders,
        totalEarnings: item?.totalEarnings,
        totalDeductionAmount: item?.totalDeductionAmount,
        carryForwardAmount: item?.carryForwardAmount,
        amountPayable: item?.amountPayable,
        fromDate: item?.fromDate,
        toDate: item?.toDate,
      }));

      return res
        .status(200)
        .json({ status: true, message: "success", data: formatted });
    } catch (error) {
      next(error);
    }
  }
);
riderRouter.get(
  "/payout-template",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // const { clientId, fromDate } = req.body;
      // const data = await service.aggregate(DB_COLLECTIONS.workHistory, [
      //   {
      //     $match: {
      //       clientId: toObjectId(clientId),
      //       status: { $nin: [2, 3] },
      //       fromDate: { $gte: new Date(fromDate) },
      //     },
      //   },
      //   {
      //     $lookup: {
      //       from: "riders",
      //       localField: "riderId",
      //       foreignField: "_id",
      //       as: "rider",
      //       pipeline: [{ $project: { mobile: 1 } }],
      //     },
      //   },
      //   {
      //     $unwind: {
      //       path: "$rider",
      //       preserveNullAndEmptyArrays: true,
      //     },
      //   },
      //   {
      //     $lookup: {
      //       from: "deductions",
      //       localField: "riderId",
      //       foreignField: "riderId",
      //       as: "deductions",
      //       pipeline: [
      //         {
      //           $match: {
      //             createdAt: { $gte: new Date(fromDate) },
      //             status: 0,
      //             type: "DEBIT",
      //           },
      //         },
      //         {
      //           $group: {
      //             _id: null,
      //             totalAmount: { $sum: "$amount" },
      //           },
      //         },
      //       ],
      //     },
      //   },
      //   {
      //     $unwind: {
      //       path: "$deductions",
      //       preserveNullAndEmptyArrays: true,
      //     },
      //   },
      //   {
      //     $project: {
      //       _id: 0,
      //       mobile: "$rider.mobile",
      //       registeredId: 1,
      //       totalDeductionAmount: { $ifNull: ["$deductions.totalAmount", 0] },
      //       no_Of_Days: "0",
      //       no_Of_Orders: "0",
      //       totalEarnings: "0",
      //       carryForwardAmount: "0",
      //     },
      //   },
      // ]);
      const data = [
        {
          ClientRegisteredId: "",
          Name: "",
          mobile: "",
          no_Of_Days: "",
          no_Of_Orders: "",
          totalEarnings: "",
          carryForwardAmount: "",
          // totalDeductionAmount:""
        },
      ];
      const { fileId, filePath } = await generateExcel(data);

      const fileUrl = `${Config.payoutFilePath}${fileId}.xlsx`;

      setTimeout(() => {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }, 5 * 60 * 1000);
      return res
        .status(200)
        .json({ status: true, message: "success", data: { url: fileUrl } });
    } catch (error) {
      next(error);
    }
  }
);
riderRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, clientId, store } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (clientId) filters.clientId = clientId;
      if (store) filters.store = store;

      const riders = await service.find(
        DB_COLLECTIONS.riders,
        filters,
        {}, // projection (return all fields)
        {}, // options
        [
          { path: "clientId", select: "name" },
          { path: "store", select: "name" },
        ]
      );

      const formatted = riders.map((rider) => ({
        id: rider?.id,
        mobile: rider?.mobile,
        altMobile: rider?.altMobile,
        fullName: rider?.fullName,
        currentAddress: rider?.currentAddress,
        emergencyContacts: rider?.emergencyContacts,
        kycDocuments: rider?.kycDocuments,
        isKyc: rider?.isKyc,
        status: rider?.status,
        createdAt: rider?.createdAt,
        updatedAt: rider?.updatedAt,
        ActiveDate: rider?.ActiveDate,
        clientName: rider?.clientId?.name,
        isOwnVehicle: rider?.isOwnVehicle,
        registeredId: rider?.registeredId,
        storeName: rider?.store?.name,
        vehicleId: rider?.vehicleId,
        vehicleUid: rider?.vehicleUid,
      }));

      res.json({
        status: true,
        message: "Riders fetched successfully",
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }
);

riderRouter.get(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = (await service.findOne(
        DB_COLLECTIONS.riders,
        {
          _id: req.params.id,
        },
        {},
        {},
        [
          { path: "clientId", select: "name" },
          { path: "store", select: "name" },
        ]
      )) as any;
      const formatedData = {
        id: data?.id,
        mobile: data?.mobile,
        altMobile: data?.altMobile,
        fullName: data?.fullName,
        currentAddress: data?.currentAddress,
        emergencyContacts: data?.emergencyContacts,
        kycDocuments: data?.kycDocuments,
        isKyc: data?.isKyc,
        status: data?.status,
        createdAt: data?.createdAt,
        updatedAt: data?.updatedAt,
        ActiveDate: data?.ActiveDate,
        clientName: data?.clientId?.name,
        isOwnVehicle: data?.isOwnVehicle,
        registeredId: data?.registeredId,
        storeName: data?.store?.name,
        vehicleId: data?.vehicleId,
        vehicleUid: data?.vehicleUid,
        bankDetails: data?.bankDetails,
      };
      return res
        .status(200)
        .json({ status: true, message: "success", data: formatedData });
    } catch (error) {
      next(error);
    }
  }
);

riderRouter.put(
  "/details/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.updateOne(
        DB_COLLECTIONS.riders,
        { _id: req.params.id },
        { ...req.body }
      );
      return res.status(201).json({ status: true, message: "success" });
    } catch (error) {
      next(error);
    }
  }
);

riderRouter.put(
  "/kyc-details/:id",
  uploadImage.fields([
    { name: "aadhaar", maxCount: 1 },
    { name: "pan", maxCount: 1 },
    { name: "license", maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (!files || Object.keys(files).length === 0) {
        return res
          .status(400)
          .json({ status: false, message: "No KYC documents uploaded" });
      }

      const rider = (await service.findOne(DB_COLLECTIONS.riders, {
        _id: id,
      })) as any;
      if (!rider) {
        return res
          .status(404)
          .json({ status: false, message: "Rider not found" });
      }

      const kycPath = path.join(__dirname, "../uploads/kyc");
      const kycDocuments: Partial<
        Record<"aadhaar" | "pan" | "license", string>
      > = {};
      const isKyc: Partial<Record<"aadhaar" | "pan" | "license", boolean>> = {};

      const keys: Array<"aadhaar" | "pan" | "license"> = [
        "aadhaar",
        "pan",
        "license",
      ];

      for (const key of keys) {
        if (files?.[key]?.[0]) {
          const oldFile = rider?.kycDocuments?.[key];
          if (oldFile) {
            const oldFilePath = path.join(kycPath, oldFile);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          }

          kycDocuments[key] = files[key][0].filename;
          isKyc[key] = true;
        }
      }

      const updatedRider = await service.updateOne(
        DB_COLLECTIONS.riders,
        { _id: id },
        {
          $set: Object.keys(kycDocuments).reduce((acc, key) => {
            acc[`kycDocuments.${key}`] =
              kycDocuments[key as keyof typeof kycDocuments];
            acc[`isKyc.${key}`] = isKyc[key as keyof typeof isKyc];
            return acc;
          }, {} as any),
        }
      );

      res.status(200).json({
        status: true,
        message: "KYC documents updated successfully",
        data: updatedRider,
      });
    } catch (error) {
      next(error);
    }
  }
);
riderRouter.get(
  "/work-history/:riderId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { riderId } = req.params;
      const data = await service.find(
        DB_COLLECTIONS.workHistory,
        { riderId: riderId },
        {},
        {},
        [
          { path: "clientId", select: "name" },
          { path: "store", select: "name" },
        ]
      );

      const formatted = data.map((item) => ({
        id: item?.id,
        status: item?.status,
        clientName: item?.clientId?.name,
        isOwnVehicle: item?.isOwnVehicle,
        registeredId: item?.registeredId,
        storeName: item?.store?.name,
        fromDate: item?.fromDate,
        toDate: item?.toDate,
        vehicleUid: item?.vehicleUid,
      }));

      return res
        .status(200)
        .json({ status: true, message: "success", data: formatted });
    } catch (error) {
      next(error);
    }
  }
);

riderRouter.post(
  "/deduction/:riderId",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uoid } = req.user as any;
      const { riderId } = req.params;
      const { type, amount, note, createdOn } = req.body;
      const isExistingRider = (await service.findOne(DB_COLLECTIONS.riders, {
        _id: riderId,
      })) as any;
      if (!isExistingRider)
        return res
          .status(404)
          .json({ status: false, message: "No rider found" });

      if (!isExistingRider.clientId)
        return res
          .status(200)
          .json({ status: false, message: "rider is inActive" });

      await service.create(DB_COLLECTIONS.deductions, {
        createdOn: createdOn ? createdOn : new Date(),
        riderId,
        mobile: isExistingRider?.mobile,
        type,
        amount,
        deductedById: uoid,
        note,
        clientId: isExistingRider?.clientId,
        registeredId: isExistingRider?.registeredId,
      });
      return res.status(200).json({ status: true, message: "success" });
    } catch (error) {
      next(error);
    }
  }
);

riderRouter.get(
  "/deduction/:riderId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { riderId } = req.params;
      const data = await service.find(
        DB_COLLECTIONS.deductions,
        { riderId },
        {},
        {},
        [{ path: "deductedById", select: "name" }]
      );
      const formatted = data.map((item) => ({
        id: item?.id,
        type: item?.type,
        amount: item?.amount,
        note: item?.note,
        deductedById: item?.deductedById?.name,
        status: item?.status,
        createdAt: item?.createdAt,
      }));
      return res
        .status(200)
        .json({ status: true, message: "success", data: formatted });
    } catch (error) {
      next(error);
    }
  }
);

riderRouter.post(
  "/payout/upload",
  upload.single("file"),
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uoid } = req.user as any;
      const { fromDate, toDate, clientId } = req.body;
      if (!req.file) {
        return res
          .status(400)
          .json({ status: false, message: "File required" });
      }

      // --- Step 1: Read Excel/CSV ---
      const workbook = req.file.originalname.endsWith(".csv")
        ? xlsx.read(req.file.buffer.toString(), { type: "string" })
        : xlsx.read(req.file.buffer, { type: "buffer" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = xlsx.utils.sheet_to_json(sheet);

      if (!rows.length) {
        return res
          .status(400)
          .json({ status: false, message: "No data found in file" });
      }

      // --- Step 2: Prepare payout objects ---
      const payouts = rows.map((row) => ({
        registeredId: row.ClientRegisteredId,
        mobile: row.mobile,
        no_Of_Days: Number(row.no_Of_Days) || 0,
        no_Of_Orders: Number(row.no_Of_Orders) || 0,
        totalEarnings: Number(row.totalEarnings) || 0,
        totalDeductionAmount: Number(row.totalDeductionAmount) || 0,
        carryForwardAmount: Number(row.carryForwardAmount) || 0,
        amountPayable: Number(row.totalEarnings) || 0,
        clientId: clientId ? clientId : null, // will assign later
        fromDate: fromDate ? fromDate : null,
        toDate: toDate ? toDate : null,
      }));

      const registeredIds = payouts.map((p) => p.registeredId);
      const mobiles = payouts.map((p) => p.mobile);

      // --- Step 3: Check duplicate payouts ---
      const duplicates = await service.find(DB_COLLECTIONS.payouts, {
        registeredId: { $in: registeredIds },
        mobile: { $in: mobiles },
        status: 0,
      });

      if (duplicates.length) {
        return res.status(400).json({
          status: false,
          message: "Found duplicate payout",
          data: duplicates[0],
        });
      }

      // --- Step 4: Update WorkHistory status in bulk ---
      // await service.updateMany(
      //   DB_COLLECTIONS.workHistory,
      //   {
      //     registeredId: { $in: registeredIds },
      //     mobile: { $in: mobiles },
      //     status: 0,
      //   },
      //   { status: 2 }
      // );

      // --- Step 5: Fetch all riders for deductions and clientId ---
      const riders = await service.find(DB_COLLECTIONS.riders, {
        mobile: { $in: mobiles },
      });

      // --- Step 7: Calculate amountPayable and assign clientId ---
      for (let p of payouts) {
        const deductions = await service.aggregate(DB_COLLECTIONS.deductions, [
          {
            $match: {
              mobile: String(p.mobile),
              registeredId: String(p.registeredId),
              status: 0,
              type: "DEBIT",
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" },
            },
          },
          {
            $project: {
              totalAmount: 1,
            },
          },
        ]);
        const modifiedDeduction =
          deductions[0]?.totalAmount - Number(p.carryForwardAmount) || 0;
        p.amountPayable = Number(p.totalEarnings) - modifiedDeduction;
        p.totalDeductionAmount = deductions[0]?.totalAmount;
      }

      // --- Step 8: Update all DEBIT deductions to status 1 in bulk ---
      await service.updateMany(
        DB_COLLECTIONS.deductions,
        {
          type: "DEBIT",
          mobile: { $in: mobiles },
          registeredId: { $in: registeredIds },
          status: 0,
        },
        { status: 1 }
      );

      // --- Step 6: Prepare deductions in bulk ---
      const deductions = payouts
        .filter((p) => p.carryForwardAmount > 0)
        .map((p) => {
          const rider = riders.find((r) => r.mobile === p.mobile);
          return {
            riderId: rider?.id,
            registeredId: p.registeredId,
            mobile: p.mobile,
            type: "DEBIT",
            amount: p.carryForwardAmount,
            note: ["CARRY_FORWARD_AMOUNT"],
            status: 0,
            deductedById: uoid,
            clientId: clientId,
          };
        });

      if (deductions.length) {
        await service.insertMany(DB_COLLECTIONS.deductions, deductions, {
          ordered: false,
        });
      }
      // --- Step 9: Insert payouts in bulk ---
      let success: any[] = [];
      let failed: { row: any; error: string }[] = [];

      try {
        success = await service.insertMany(DB_COLLECTIONS.payouts, payouts, {
          ordered: false,
        });
      } catch (err: any) {
        if (err.insertedDocs) success = err.insertedDocs;

        const writeErrors =
          err.writeErrors || err.result?.result?.writeErrors || [];
        failed = writeErrors.map((e: any) => ({
          row: payouts[e.index],
          error: e.errmsg || e.err?.message || "Duplicate entry",
        }));
      }

      return res.status(200).json({
        status: true,
        message: "Payout upload processed",
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

// riderRouter.post(
//   "/payout/upload",
//   upload.single("file"),
//   verifyToken,
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { uoid } = req.user as any;
//       if (!req.file) {
//         return res
//           .status(400)
//           .json({ status: false, message: "File required" });
//       }

//       let workbook;
//       if (req.file.originalname.endsWith(".csv")) {
//         workbook = xlsx.read(req.file.buffer.toString(), { type: "string" });
//       } else {
//         workbook = xlsx.read(req.file.buffer, { type: "buffer" });
//       }

//       const sheetName = workbook.SheetNames[0];
//       const sheet = workbook.Sheets[sheetName];
//       const rows: any[] = xlsx.utils.sheet_to_json(sheet);

//       // Prepare payout documents
//       const payouts = rows.map((row) => ({
//         registeredId: row["registeredId"],
//         mobile: row["mobile"],
//         no_Of_Days: row["no_Of_Days"] || 0,
//         no_Of_Orders: row["no_Of_Orders"] || 0,
//         totalEarnings: row["totalEarnings"] || 0,
//         totalDeductionAmount: row["totalDeductionAmount"] || 0,
//         carryForwardAmount: row["carryForwardAmount"] || 0,
//         amountPayable: row["totalEarnings"] || 0,
//         clientId: "",
//       }));

//       // step1 check duplicate payout exists
//       let isDuplicatePayout = false;
//       let duplicate;
//       for (const payout of payouts) {
//         const doc = await service.findOne(DB_COLLECTIONS.payouts, {
//           registeredId: payout.registeredId,
//           mobile: payout.mobile,
//           status: 0,
//         });
//         if (doc) {
//           isDuplicatePayout = true;
//           duplicate = doc;
//           break;
//         }
//       }
//       if (isDuplicatePayout)
//         return res.status(400).json({
//           status: false,
//           message: "found duplicate payout",
//           data: duplicate,
//         });

//       // Update workHistory status
//       for (let payout of payouts) {
//         const workHistoryDoc = (await service.updateOne(
//           DB_COLLECTIONS.workHistory,
//           {
//             mobile: payout.mobile,
//             status: 0,
//             registeredId: payout.registeredId,
//           },
//           {
//             status: 2,
//           }
//         )) as any;

//         if (payout.carryForwardAmount > 0) {
//           const rider = (await service.findOne(DB_COLLECTIONS.riders, {
//             mobile: workHistoryDoc.mobile,
//           })) as any;
//           await service.create(DB_COLLECTIONS.deductions, {
//             riderId: rider._id,
//             registeredId: payout.registeredId,
//             mobile: payout.mobile,
//             type: "DEBIT",
//             amount: payout.carryForwardAmount,
//             note: ["CARRY_FORWARD_AMOUNT"],
//             status: 0,
//             deductedById: uoid,
//             clientId: workHistoryDoc.clientId,
//           });
//         }
//         const modifiedDeduction =
//           Number(payout.totalDeductionAmount) -
//             Number(payout.carryForwardAmount) || 0;
//         payout.amountPayable = Number(payout.totalEarnings) - modifiedDeduction;
//         payout.clientId = workHistoryDoc.clientId;
//       }
//       // update deductions
//       for (let payout of payouts) {
//         await service.updateOne(
//           DB_COLLECTIONS.deductions,
//           {
//             type: "DEBIT",
//             mobile: payout.mobile,
//             status: 0,
//             registeredId: payout.registeredId,
//           },
//           {
//             status: 1,
//           }
//         );
//       }

//       // Bulk insert payouts
//       let success: any[] = [];
//       let failed: { row: any; error: string }[] = [];

//       try {
//         success = await service.insertMany(DB_COLLECTIONS.payouts, payouts, {
//           ordered: false, // continue on error
//         });
//       } catch (err: any) {
//         if (err.insertedDocs) success = err.insertedDocs;

//         // Handle write errors
//         const writeErrors =
//           err.writeErrors || err.result?.result?.writeErrors || [];
//         failed = writeErrors.map((e: any) => ({
//           row: payouts[e.index],
//           error: e.errmsg || e.err?.message || "Duplicate entry",
//         }));
//       }

//       return res.status(200).json({
//         status: true,
//         message: "Payout upload processed",
//         successCount: success.length,
//         failureCount: failed.length,
//         success,
//         failed,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// );
export default riderRouter;
