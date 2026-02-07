import type { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabaseClient.js";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized: Token missing" });
  }

  const token = authHeader.split(" ")[1];
  
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
  }

  (req as any).user = {
    id: user.id,
    wallet_address: user.user_metadata?.wallet_address || user.email 
  };
  
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user || !user.wallet_address) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not identified" });
  }

  const allowedAdmins = (process.env.ADMIN_WALLETS || "").split(",").map(w => w.trim());

  if (!allowedAdmins.includes(user.wallet_address)) {
    console.warn(`⚠️ Access Denied: Wallet ${user.wallet_address} tried to access Admin route.`);
    return res.status(403).json({ success: false, message: "Forbidden: You are not an Admin." });
  }

  next();
};