import mongoose, { Schema, Document } from "mongoose";
import Config from "../config";

const DB_COLLECTIONS = Config.DB_COLLECTIONS;

export interface IWorkHistory extends Document {
  riderId: mongoose.Types.ObjectId;
  mobile: string;
  fromDate: Date;
  toDate: Date;
  clientId: mongoose.Types.ObjectId;
  registeredId: string;
  isOwnVehicle: boolean;
  vehicleId: mongoose.Types.ObjectId;
  vehicleUid: string;
  store: mongoose.Types.ObjectId;
  status: number; // 0=> active, 1=> inactive, 2=> payout updated, 3=> payout done
}

const workHistorySchema = new Schema<IWorkHistory>({
  riderId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: DB_COLLECTIONS.riders, // replace with actual model name if different
  },
  mobile: { type: String, required: true },
  fromDate: {
    type: Date,
    required: true,
  },
  toDate: {
    type: Date,
  },
  clientId: { type: Schema.Types.ObjectId, ref: DB_COLLECTIONS.users,required:true },
  isOwnVehicle: { type: Boolean },
  vehicleId: { type: Schema.Types.ObjectId, ref: DB_COLLECTIONS.vehicles },
  vehicleUid: { type: String },
  store: { type: Schema.Types.ObjectId, ref: DB_COLLECTIONS.stores },
  registeredId: { type: String, required: true, unique: true },
  status: { type: Number, default: 0 },
});

export const WorkHistoryModel =
  mongoose.models[DB_COLLECTIONS.workHistory] ||
  mongoose.model<IWorkHistory>(DB_COLLECTIONS.workHistory, workHistorySchema);
