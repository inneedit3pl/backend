import { NextFunction, Request, Response } from "express";
import { createLogger, format, transports } from "winston";

const logFormatter = format.printf(({ timestamp, level, message, stack }) => {
  const errorMessage =
    stack ||
    (typeof message === "object" ? JSON.stringify(message, null, 2) : message);
  return `${timestamp} ${level}: ${errorMessage}`;
});

export const logToFile = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({
      filename: "logs/error.log",
      maxsize: 52 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

export const logToConsole = createLogger({
  level: "info",
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.errors({ stack: true }),
    logFormatter
  ),
  transports: [new transports.Console()],
});

export async function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestLog = {
    timestamp: new Date().toISOString(),
    logType: "REQUEST_LOG",
    env: process.env.NODE_ENV,
    level: "info",
    api: req.url,
    method: req.method,
    body: req.body,
    client: req.ip,
  };

  logToFile.info(requestLog);
  logToConsole.info(requestLog);

  next();
}
