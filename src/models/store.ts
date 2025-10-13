import mongoose, { Schema, Document } from "mongoose";
import Config from "../config";
const DB_COLLECTIONS = Config.DB_COLLECTIONS;

export interface IStore extends Document {
  name: string;
  clientId: mongoose.Types.ObjectId;
  status?: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
  address: string;
}

const storeSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    address: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const StoreModel =
  mongoose.models[DB_COLLECTIONS.stores] ||
  mongoose.model<IStore>(DB_COLLECTIONS.stores, storeSchema);
