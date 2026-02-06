import dotenv from "dotenv";

dotenv.config();

const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Environment variable ${key} is missing!`);
  }
  return value;
};

export const env = {
  supabaseUrl: getEnvVar("SUPABASE_URL"),
  supabaseKey: getEnvVar("SUPABASE_KEY"),
  rpcUrl: getEnvVar("RPC_URL"),
  privyAppId: getEnvVar("PRIVY_APP_ID"),
  privyAppSecret: getEnvVar("PRIVY_APP_SECRET"),
   privyVerificationKey: getEnvVar("PRIVY_VERIFICATION_KEY"),
  port: process.env.PORT || "4000",
  nodeEnv: process.env.NODE_ENV || "development",
};