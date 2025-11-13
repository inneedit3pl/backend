import express from "express";
import { requestLogger } from "./middleWares/logger";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import errorHandler from "./middleWares/errorHandler";
import apiRouter from "./routes";
import Config from "./config";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.urlencoded({ extended: false }));
app.use(
  compression({
    level: 6,
    threshold: 0,
  })
);
app.use(helmet());
app.use(requestLogger);
app.use(Config.API_PREFIX, apiRouter);
app.use(errorHandler);

app.get('/api/v1/health', (req, res) => {
  res.send('OK');
});
export default app;
