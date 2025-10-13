import mongoose, { Schema, Document } from "mongoose";
import Config from "../config";

const DB_COLLECTIONS = Config.DB_COLLECTIONS;

export interface IDeduction extends Document {
  riderId: mongoose.Types.ObjectId;
  registeredId: string;
  mobile: string;
  type: string;
  amount: number;
  note: [string];
  status: number; // 0=> inital, 1=> fullfilled
  deductedById: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
}

const deductionSchema = new Schema<IDeduction>(
  {
    riderId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: DB_COLLECTIONS.riders,
    },
    registeredId: { type: String, required: true },
    clientId: { type: Schema.Types.ObjectId, ref: DB_COLLECTIONS.users },
    mobile: { type: String, required: true },
    deductedById: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: DB_COLLECTIONS.users,
    },
    type: { type: String, enum: ["CREDIT", "DEBIT"], required: true },
    amount: { type: Number, required: true },
    note: { type: [String], required: true },
    status: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DeductionModel =
  mongoose.models[DB_COLLECTIONS.deductions] ||
  mongoose.model<IDeduction>(DB_COLLECTIONS.deductions, deductionSchema);
