import type { Request, Response } from "express";
import { LeaderboardModel } from "../models/Leaderboard.js";
import { handleApiError } from "../utils/errorHandler.js";

export class LeaderboardController {
  static async getProfitLeaderboard(req: Request, res: Response) {
    try {
      const data = await LeaderboardModel.getTopEarners();
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch profit leaderboard");
    }
  }

  static async getVolumeLeaderboard(req: Request, res: Response) {
    try {
      const data = await LeaderboardModel.getTopDepositors();
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch volume leaderboard");
    }
  }
}