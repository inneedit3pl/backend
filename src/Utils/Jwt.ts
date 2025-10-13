import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import fs from "fs";
import Config from "../config";
import { MongooseService } from "../mongoSetup";

const DB_COLLECTIONS = Config.DB_COLLECTIONS;
const service = new MongooseService();

declare module "express-serve-static-core" {
  interface Request {
    user?: string | JwtPayload;
  }
}

if (!Config.JWT_PRIVATE_KEY_PATH || !Config.JWT_PUBLIC_KEY_PATH) {
  throw new Error("JWT key paths are not defined in Config");
}

const privateKey = fs.readFileSync(Config.JWT_PRIVATE_KEY_PATH, "utf8");
const publicKey = fs.readFileSync(Config.JWT_PUBLIC_KEY_PATH, "utf8");

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization header malformed" });
    }

    const token = authHeader.split(" ")[1]!;
    const decoded: any = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
    });
    req.user = decoded;

    const user = await service.findOne(DB_COLLECTIONS.users, {
      _id: decoded.uoid,
      loginCount: decoded.loginCount,
    });
    if (!user)
      return res.status(401).json({
        message: "This account has been logged in from another device.",
      });
    next();
  } catch (error: any) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function generateToken(payload: Record<string, any>): string {
  try {
    const signOptions: SignOptions = {
      algorithm: "RS256",
      expiresIn: "1d",
      keyid: "key-1",
    };

    return jwt.sign(payload, privateKey, signOptions);
  } catch (error: any) {
    console.error("Error generating token:", error.message);
    throw new Error("Token generation failed");
  }
}
