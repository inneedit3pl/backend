import mongoose, { Schema, Document } from "mongoose";
import Config from "../config";

const DB_COLLECTIONS = Config.DB_COLLECTIONS;

export interface IPayout extends Document {
  registeredId: string;
  mobile: string;
  no_Of_Days: number;
  no_Of_Orders: number;
  totalEarnings: number;
  totalDeductionAmount: number;
  carryForwardAmount: number;
  amountPayable: number;
  clientId: mongoose.Types.ObjectId;
  status: number; // 0=> raised 1=> payment sent
  fromDate: Date;
  toDate: Date;
}

const payoutSchema = new Schema<IPayout>(
  {
    registeredId: { type: String, required: true },
    mobile: { type: String, required: true },
    no_Of_Days: { type: Number, default: 0 },
    no_Of_Orders: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalDeductionAmount: { type: Number, default: 0 },
    carryForwardAmount: { type: Number, default: 0 },
    amountPayable: { type: Number, default: 0 },
    clientId: { type: Schema.Types.ObjectId, ref: DB_COLLECTIONS.users },
    status: { type: Number, default: 0 }, // 0 => raised, 1 => payment sent
    fromDate: { type: Date },
    toDate: { type: Date },
  },
  { timestamps: true }
);

export const PayoutModel =
  mongoose.models[DB_COLLECTIONS.payouts] ||
  mongoose.model<IPayout>(DB_COLLECTIONS.payouts, payoutSchema);
