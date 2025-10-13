import mongoose, { Schema, Document } from "mongoose";
import Config from "../config";
const DB_COLLECTIONS = Config.DB_COLLECTIONS;

export interface IUser extends Document {
  name: string;
  email?: string;
  password?: string;
  loginCount?: number;
  otp?: string;
  mobile?: string;
  status?: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
  role: "SA"|"CLIENT";
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, lowercase: true },
    password: { type: String, },
    role: { type: String, required: true, enum: ["SA","CLIENT"] },
    loginCount: { type: Number, default: 0 },
    otp: { type: String },
    mobile: { type: String,  unique: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const UserModel =
  mongoose.models[DB_COLLECTIONS.users] ||
  mongoose.model<IUser>(DB_COLLECTIONS.users, userSchema);
