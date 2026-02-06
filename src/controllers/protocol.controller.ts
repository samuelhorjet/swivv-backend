import type { Request, Response } from "express";
import { ProtocolModel } from "../models/Protocol.js";
import { ApiResponse } from "../utils/response.js";

export class ProtocolController {
  static async getConfig(req: Request, res: Response) {
    try {
      const config = await ProtocolModel.getConfig();
      return ApiResponse.success(res, config);
    } catch (error) {
      return ApiResponse.error(res, "Failed to fetch protocol config", error);
    }
  }
}