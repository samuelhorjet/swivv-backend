import type { Response } from "express";

export const handleApiError = (res: Response, error: unknown, customMessage: string) => {
  console.error(`❌ ${customMessage}:`, error);

  const message = error instanceof Error ? error.message : "Unknown database error";
  
  return res.status(500).json({
    success: false,
    message: customMessage,
    error: message
  });
};