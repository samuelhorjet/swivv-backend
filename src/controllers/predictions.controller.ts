import type { Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { supabase } from "../config/supabaseClient.js"; 
import { contractService } from "../services/solana/contract.service.js";
import { ApiResponse } from "../utils/response.js"; 
import { handleApiError } from "../utils/errorHandler.js"; 

export class PredictionController {
  
  static async getMyHistory(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (!user || !user.wallet_address) {
        return ApiResponse.error(res, "Unauthorized: Wallet not found", null, 401);
      }

      const { data, error } = await supabase
        .from("predictions")
        .select("*, pool:pools(name, status, final_outcome)")
        .eq("user_wallet", user.wallet_address)
        .order("creation_ts", { ascending: false });

      if (error) throw error;

      return ApiResponse.success(res, data || []);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch your history");
    }
  }

  static async getPoolStats(req: Request, res: Response) {
    try {
      const { pool_id } = req.params;

      if (!pool_id) {
         return ApiResponse.validationError(res, "Pool ID is required");
      }

      const { count, error } = await supabase
        .from("predictions")
        .select("*", { count: 'exact', head: true }) 
        .eq("pool_id", pool_id);

      if (error) throw error;

      return ApiResponse.success(res, { 
        pool_id, 
        total_participants: count 
      });
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch stats");
    }
  }

  static async sync(req: Request, res: Response) {
    try {
      const { betPubkey } = req.body;
      
      if (!betPubkey) {
        return ApiResponse.validationError(res, "betPubkey is required");
      }

      console.log(`🔌 Manual Sync requested for bet: ${betPubkey}`);
      
      await contractService.syncSpecificBet(new PublicKey(betPubkey));
      
      return ApiResponse.success(res, { status: "synced" }, "Bet synced successfully");
    } catch (error) {
      return handleApiError(res, error, "Sync failed");
    }
  }
}