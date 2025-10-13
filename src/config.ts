require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
const Config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 5000,
  NODE_ENV: process.env.NODE_ENV,
  DB_URL: process.env.DB_URL,
  API_PREFIX: process.env.API_PREFIX || "/api/v1/",
  JWT_PRIVATE_KEY_PATH: "./keys/privateKey.pem",
  JWT_PUBLIC_KEY_PATH: "./keys/publicKey.pem",
  GOOGLE_API_KEY:
    process.env.GOOGLE_API_KEY || "AIzaSyB7R-FHSiPtQYSpoSZ0z5DKLQOMjK1_z-I",
  DB_COLLECTIONS: {
    users: "users",
    vehicles: "vehicles",
    stores: "stores",
    riders: "riders",
    workHistory: "workhistories",
    deductions: "deductions",
    payouts:"payouts"
  },
  payoutFilePath:
    process.env.NODE_ENV === "dev"
      ? `http://localhost:${process.env.PORT}/uploads/tmp/`
      : `https://${process.env.DOMAIN}/uploads/tmp/`,
};

export default Config;
