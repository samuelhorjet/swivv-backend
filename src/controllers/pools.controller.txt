import type { Request, Response } from "express";
import { PoolModel } from "../models/Pool.js";
import { supabase } from "../config/supabaseClient.js";

export class PoolController {
  private static safeParse(metadata: string | null) {
    if (!metadata) return null;
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  static async getMarkets(req: Request, res: Response) {
    try {
      const pools = await PoolModel.getAllVisible();

      const parsedPools = pools.map((pool) => ({
        ...pool,
        // Use THIS class (PoolController), not UserController!
        metadata: PoolController.safeParse(pool.metadata),
      }));

      return res.status(200).json(parsedPools);
    } catch (error) {
      console.error("❌ Error in getMarkets:", error);
      return res.status(500).json({ error: "Failed to fetch markets" });
    }
  }

  static async getPoolDetail(req: Request, res: Response) {
    try {
      const { address } = req.params;

      // Fix for Type Error: Ensure address is a string
      if (!address || typeof address !== "string") {
        return res
          .status(400)
          .json({ error: "Valid pool address is required" });
      }

      const { data: pool, error } = await supabase
        .from("pools")
        .select("*")
        .eq("pool_pubkey", address) // Removed the rogue 'x'
        .single();

      if (error || !pool) {
        return res.status(404).json({ error: "Pool not found" });
      }

      return res.status(200).json(pool);
    } catch (error) {
      console.error("❌ Pool Detail Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async deletePool(req: Request, res: Response) {
    try {
      const { address } = req.params;

      if (!address || typeof address !== "string") {
        return res.status(400).json({ error: "Invalid address" });
      }

      await PoolModel.hidePool(address);
      return res.status(200).json({ message: "Pool hidden successfully" });
    } catch (error) {
      console.error("❌ Delete Pool Error:", error);
      return res.status(500).json({ error: "Delete failed" });
    }
  }
}
