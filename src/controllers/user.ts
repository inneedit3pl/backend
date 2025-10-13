import { NextFunction, Request, Response, Router } from "express";
import { IUser } from "../models/user";
import { MongooseService } from "../mongoSetup";
import Config from "../config";
import { Bcrypt } from "../Utils/Bcrypt";
import { generateToken, verifyToken } from "../Utils/Jwt";

const DB_COLLECTIONS = Config.DB_COLLECTIONS;
const userRouter = Router();
const service = new MongooseService();

userRouter.post(
  "/add-SA",
  // verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let body = req.body as IUser;
      body.role = "SA";
      body.password = await Bcrypt.hashPassword(body.password as string);

      await service.create(DB_COLLECTIONS.users, body);

      return res.json({ status: true, message: "success" });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.post(
  "/add-client",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let body = req.body as IUser;
      body.role = "CLIENT";
      await service.create(DB_COLLECTIONS.users, body);
      return res.json({ status: true, message: "success" });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as {
        email: string;
        password: string;
      };

      const isExistingAccount = await service.findOne<IUser>(
        DB_COLLECTIONS.users,
        { email },
        { email: 1, password: 1, loginCount: 1, role: 1 }
      );

      if (!isExistingAccount)
        return res.status(404).json({ message: "No user found on that email" });
      const isPasswordMatched = await Bcrypt.comparePassword(
        password,
        isExistingAccount.password as string
      );

      if (!isPasswordMatched)
        return res.status(404).json({ message: "Password mismatched" });
      const loginCount = (isExistingAccount.loginCount ?? 0) + 1;
      await service.updateOne(
        DB_COLLECTIONS.users,
        { email },
        {
          loginCount,
        }
      );
      const token = generateToken({
        email: isExistingAccount.email,
        uoid: isExistingAccount.id,
        loginCount,
        role: isExistingAccount.role,
      });
      return res.json({
        status: true,
        message: "Login Successful",
        token,
      });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.put(
  "/update-password",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uoid } = req.user as any;
      const { newPassword, oldPassword } = req.body;
      const user = await service.findOne<IUser>(
        DB_COLLECTIONS.users,
        { _id: uoid },
        { password: 1 }
      );
      if (!user)
        return res
          .status(404)
          .json({ status: false, message: "No user found" });

      const isOldPassMatched = await Bcrypt.comparePassword(
        oldPassword,
        user.password as string
      );
      if (!isOldPassMatched)
        return res
          .status(400)
          .json({ status: false, message: "Old password mismatched" });
      await service.updateOne(
        DB_COLLECTIONS.users,
        { _id: uoid },
        { password: await Bcrypt.hashPassword(newPassword) }
      );
      return res
        .status(201)
        .json({ status: true, message: "Password updated success" });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.put(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.updateOne(
        DB_COLLECTIONS.users,
        { _id: req.params.id },
        { ...req.body }
      );
      return res.status(201).json({ status: true, message: "success" });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.get(
  "/",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uoid } = req.user as any;
      const data = (await service.findOne(
        DB_COLLECTIONS.users,
        { _id: uoid },
        { name: 1, role: 1, email: 1, mobile: 1 }
      )) as any;
      const formatted = {
        id: data?.id,
        name: data?.name,
        role: data?.role,
        email: data?.email,
        mobile: data?.mobile,
      };
      return res.json({ status: true, data: formatted, message: "success" });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.get(
  "/all",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = req.query as { role: string };
      if (!["SA", "CLIENT"].includes(role))
        return res.status(400).json({ status: true, message: "invalid-role" });
      let data = [];
      if (role === "CLIENT") {
        data = await service.aggregate(DB_COLLECTIONS.users, [
          {
            $match: {
              role: role,
            },
          },
          {
            $lookup: {
              from: "riders",
              localField: "_id",
              foreignField: "clientId",
              as: "riders",
              pipeline: [
                {
                  $project: {
                    name: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "vehicles",
              localField: "_id",
              foreignField: "clientId",
              as: "vehicles",
              pipeline: [
                {
                  $project: {
                    uid: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "stores",
              localField: "_id",
              foreignField: "clientId",
              as: "stores",
              pipeline: [
                {
                  $project: {
                    name: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              _id: 0,
              id: "$_id",
              name: 1,
              totalRiders: { $size: "$riders" },
              totalVehicles: { $size: "$vehicles" },
              totalStores: { $size: "$stores" },
            },
          },
        ]);
      } else {
      }

      return res.json({ status: true, data: data, message: "success" });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.get(
  "/client-options",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await service.aggregate(DB_COLLECTIONS.users, [
        {
          $match: {
            role: "CLIENT",
          },
        },
        {
          $project: {
            _id: 0,
            id: "$_id",
            name: 1,
          },
        },
      ]);

      return res.json({ status: true, data: data, message: "success" });
    } catch (error) {
      next(error);
    }
  }
);

export default userRouter;
