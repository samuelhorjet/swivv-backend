import type { Request, Response } from "express";
import { PoolModel } from "../models/Pool.js";
import { PredictionModel } from "../models/Prediction.js";
import { UserModel } from "../models/User.js";
import { handleApiError } from "../utils/errorHandler.js";

export class StatsController {
  static async getGlobalStats(req: Request, res: Response) {
    try {
      const [userCount, poolCount, betStats] = await Promise.all([
        UserModel.getTotalUserCount(),
        PoolModel.getTotalPoolCount(),
        PredictionModel.getGlobalBetStats(),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalUsers: userCount,
          totalPools: poolCount,
          totalBets: betStats.totalBets,
          totalVolumeUSDC: betStats.totalVolume / 1e6, 
          activeMarkets: poolCount, 
        }
      });
    } catch (error) {
      return handleApiError(res, error, "Failed to aggregate global stats");
    }
  }
}