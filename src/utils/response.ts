import type { Response } from "express";

export class ApiResponse {
  static success(res: Response, data: any, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, message: string, error: any = null, statusCode = 500) {
    console.error(`❌ API Error [${message}]:`, error);
    
    return res.status(statusCode).json({
      success: false,
      message,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
  
  static validationError(res: Response, message: string) {
    return res.status(400).json({
      success: false,
      message: "Validation Failed",
      error: message
    });
  }
}