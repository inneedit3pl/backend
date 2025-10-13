import { Router } from "express";
import userRouter from "../controllers/user";
import vehicleRouter from "../controllers/vehicle";
import storeRouter from "../controllers/store";
import riderRouter from "../controllers/rider";
const apiRouter = Router();

apiRouter.use("/user", userRouter);
apiRouter.use("/vehicle", vehicleRouter);
apiRouter.use("/store", storeRouter);
apiRouter.use("/rider", riderRouter);
export default apiRouter;
