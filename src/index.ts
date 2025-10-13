import http from "http";
import app from "./app";
import Config from "./config";
import "./models";
import { connectDB } from "./mongoSetup";

async function startServer() {
  if (!process.env.DB_URL) {
    console.error("❌ DB_URL is not set in environment variables.");
    process.exit(1);
  }

  if (!process.env.NODE_ENV) {
    console.error("❌ NODE_ENV is not set in environment variables.");
    process.exit(1);
  }

  try {
   
    await connectDB();

    const server = http.createServer(app);

    server.listen(Config.PORT, () => {
      console.log(`🚀 Server running on port ${Config.PORT}`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${Config.PORT} is already in use.`);
      } else {
        console.error("❌ Server error:", err);
      }
      process.exit(1);
    });

    process.on("SIGINT", () => {
      console.log("🛑 SIGINT received. Shutting down gracefully...");
      server.close(() => {
        console.log("✅ Server closed.");
        process.exit(0);
      });
    });

    process.on("SIGTERM", () => {
      console.log("🛑 SIGTERM received. Shutting down gracefully...");
      server.close(() => {
        console.log("✅ Server closed.");
        process.exit(0);
      });
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
