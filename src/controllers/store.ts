import { NextFunction, Request, Response, Router } from "express";
import { MongooseService } from "../mongoSetup";
import Config from "../config";
import { verifyToken } from "../Utils/Jwt";
const DB_COLLECTIONS = Config.DB_COLLECTIONS;
const GOOGLE_API_KEY = Config.GOOGLE_API_KEY;
const storeRouter = Router();
const service = new MongooseService();

storeRouter.post(
  "/",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.create(DB_COLLECTIONS.stores, { ...req.body });
      return res.status(200).json({ status: true, message: "Store created" });
    } catch (error) {
      next(error);
    }
  }
);

storeRouter.get(
  "/by-client",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.query;
      if (!clientId)
        return res
          .status(400)
          .json({ status: false, message: "client ID required" });

      const data = await service.find(
        DB_COLLECTIONS.stores,
        { clientId: clientId },
        { name: 1, address: 1 }
      );
      const formatted = data.map((item: any) => ({
        id: item?.id,
        name: item?.name,
        address: item?.address,
      }));
      return res.json({ status: true, message: "success", data: formatted });
    } catch (error) {
      next(error);
    }
  }
);

storeRouter.delete(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.deleteOne(DB_COLLECTIONS.stores, { _id: req.params.id });
      return res
        .status(200)
        .json({ status: true, message: "store deleted success" });
    } catch (error) {
      next(error);
    }
  }
);

storeRouter.get(
  "/places",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { input } = req.query;

      if (!input) {
        return res
          .status(400)
          .json({ status: false, message: "Input query is required" });
      }
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input as string
      )}&components=country:in&types=geocode&key=${GOOGLE_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK") {
        return res
          .status(500)
          .json({ error: data.error_message || "API error" });
      }

      const suggestions = data.predictions.map((p: any) => (
        // id: p.place_id,
        // main: p.structured_formatting.main_text,
        // secondary: p.structured_formatting.secondary_text,
      p.description
        // types: p.types,
      ));

      res.json({ status: true, data: suggestions, message: "success" });
    } catch (error) {
      next(error);
    }
  }
);
export default storeRouter;
