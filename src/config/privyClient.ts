import { PrivyClient, verifyAccessToken } from "@privy-io/node";
import { env } from "./env.js";

export const privy = new PrivyClient({
  appId: env.privyAppId,
  appSecret: env.privyAppSecret
});

export { verifyAccessToken }
console.log("✅ Privy Server SDK Initialized.");