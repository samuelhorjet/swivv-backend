import type { Request, Response } from "express";
import { privy, verifyAccessToken } from "../config/privyClient.js";
import { UserModel } from "../models/User.js";
import { handleApiError } from "../utils/errorHandler.js";
import { env } from "../config/env.js"; 

export class UserController {
  static async syncUser(req: Request, res: Response) {
    try {
      const { token, username } = req.body;

      if (!token) {
        return res.status(400).json({ error: "No Privy token provided." });
      }

      const verifiedClaims = await verifyAccessToken({
        access_token: token,
        app_id: env.privyAppId,
        verification_key: env.privyVerificationKey
      });
      
      const privyUser = await privy.users()._get(verifiedClaims.user_id);

      const embeddedWallet = privyUser.linked_accounts?.find(
        (acc: any) => acc.type === "wallet" && acc.walletClientType === "privy"
      );

      if (!embeddedWallet || !("address" in embeddedWallet)) {
        return res.status(400).json({
          error: "No embedded Solana wallet found.",
        });
      }

      const mainAccount = privyUser.linked_accounts?.[0];
      const authMethod = mainAccount?.type.includes("google")
        ? "google"
        : mainAccount?.type.includes("email")
          ? "email"
          : "wallet";

      const syncPayload: any = {
        privy_user_id: privyUser.id,
        auth_identifier: privyUser.id,
        auth_method: authMethod,
        wallet_address: embeddedWallet.address as string,
        username: username || undefined,
      };

      const emailAccount = privyUser.linked_accounts?.find(
        (acc) => acc.type === "email"
      );

      if (emailAccount && "address" in emailAccount) {
        syncPayload.email = emailAccount.address;
      }

      const { user, status } = await UserModel.smartSync(syncPayload);

      return res.status(200).json({
        message: "Sync successful",
        status,
        user,
      });
    } catch (error) {
      return handleApiError(res, error, "User sync failed");
    }
  }
}