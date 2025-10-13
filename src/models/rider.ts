import mongoose, { Schema, Document } from "mongoose";
import Config from "../config";

const DB_COLLECTIONS = Config.DB_COLLECTIONS;

export interface IRider extends Document {
  mobile: string;
  altMobile?: string;
  fullName: string;
  currentAddress?: string;
  emergencyContacts?: { name: string; mobile: string }[];
  kycDocuments?: {
    aadhaar: string;
    pan: string;
    license: string;
  };
  isKyc?: {
    aadhaar: boolean;
    pan: boolean;
    license: boolean;
  };
  clientId?: mongoose.Types.ObjectId;
  isOwnVehicle?: boolean;
  vehicleId?: mongoose.Types.ObjectId;
  vehicleUid?: string;
  store?: mongoose.Types.ObjectId;
  registeredId?: string;
  ActiveDate?: Date;
  status: string;
  createdOn: Date;
  isBlocked?: Boolean;
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    accountName: string;
  };
  // carryForwardAmount?: number;
}

const riderSchema = new Schema<IRider>(
  {
    mobile: { type: String, required: true, unique: true },
    altMobile: { type: String },
    fullName: { type: String, required: true },
    currentAddress: { type: String },
    createdOn: { type: Date },
    emergencyContacts: [
      {
        name: { type: String },
        mobile: { type: String },
      },
    ],

    kycDocuments: {
      aadhaar: { type: String },
      pan: { type: String },
      license: { type: String },
    },

    isKyc: {
      aadhaar: { type: Boolean, default: false },
      pan: { type: Boolean, default: false },
      license: { type: Boolean, default: false },
    },

    clientId: { type: Schema.Types.ObjectId, ref: DB_COLLECTIONS.users },
    isOwnVehicle: { type: Boolean },
    vehicleId: { type: Schema.Types.ObjectId, ref: DB_COLLECTIONS.vehicles },
    vehicleUid: { type: String },
    store: { type: Schema.Types.ObjectId, ref: DB_COLLECTIONS.stores },

    registeredId: { type: String },
    ActiveDate: { type: Date },
    status: { type: String, enum: ["active", "inactive"], default: "inactive" },
    isBlocked: { type: Boolean, default: false },
    bankDetails: {
      bankName: { type: String },
      accountNo: { type: String },
      ifsc: { type: String },
      accountName: { type: String },
    },
    // carryForwardAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const RiderModel =
  mongoose.models[DB_COLLECTIONS.riders] ||
  mongoose.model<IRider>(DB_COLLECTIONS.riders, riderSchema);

RiderModel.collection.createIndex(
  { registeredId: 1 },
  {
    unique: true,
    partialFilterExpression: { registeredId: { $exists: true } },
  }
);
