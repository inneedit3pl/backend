import  { Request, Response, NextFunction } from "express";

// Extend the default Error object
interface CustomError extends Error {
  statusCode?: number;
  path?: string;
  value?: string;
  errors?: Record<string, any>;
}

const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("🚨 Error caught by middleware:", err);

 
  if (err.name === "ValidationError" && err.errors) {
    err.statusCode = 400;
    err.message = Object.values(err.errors)
      .map((val: any) => val.message)
      .join(", ");
  }

  if (err.name === "CastError") {
    err.statusCode = 400;
    err.message = `Invalid ${err.path}: ${err.value}`;
  }

  const errStatus = err.statusCode || 500;
  const errMsg = err.message || "Something went wrong";

  res.status(errStatus).json({
    success: false,
    status: errStatus,
    message: errMsg,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export default errorHandler;
