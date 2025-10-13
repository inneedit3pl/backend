import mongoose, { Schema, Document } from "mongoose";
import Config from "../config";
const DB_COLLECTIONS = Config.DB_COLLECTIONS;

export enum VehicleStatus {
  AVAILABLE = "AVAILABLE",
  ASSIGNED = "ASSIGNED",
}

export interface IVehicle extends Document {
  modelName: string;
  registrationNo?: string;
  uid: string;
  motorNo?: string;
  chassisNo?: string;
  imei: string;
  purchaseDate?: Date;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
  riderId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  status?: VehicleStatus;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    modelName: { type: String, required: true },
    registrationNo: { type: String, unique: true },
    uid: { type: String, unique: true, required: true },
    motorNo: { type: String, unique: true },
    chassisNo: { type: String, unique: true },
    imei: { type: String, unique: true, required: true },
    purchaseDate: { type: Date, default: Date.now },
    warrantyStartDate: { type: Date, default: Date.now },
    warrantyEndDate: { type: Date },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "riders" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    status: {
      type: String,
      enum: Object.values(VehicleStatus),
      default: VehicleStatus.AVAILABLE,
    },
  },
  { timestamps: true, strict: true }
);

vehicleSchema.index({ riderId: 1 });
vehicleSchema.index({ clientId: 1 });

export const VehicleModel =
  mongoose.models[DB_COLLECTIONS.vehicles] ||
  mongoose.model<IVehicle>(DB_COLLECTIONS.vehicles, vehicleSchema);
