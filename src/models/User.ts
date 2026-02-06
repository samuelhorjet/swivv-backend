import { supabase } from "../config/supabaseClient.js";

export interface UserRow {
  wallet_address: string;
  username?: string;
  auth_method: string;
  auth_identifier: string; 
  privy_user_id: string;    
  email?: string;
  avatar_url?: string;
  last_login_at?: string;
}

export class UserModel {
  static async smartSync(verifiedData: Partial<UserRow>) {
    const did = verifiedData.privy_user_id;
    if (!did) throw new Error("Privy DID is required for sync.");

    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("privy_user_id", did)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([{ ...verifiedData, last_login_at: new Date().toISOString() }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      return { user: newUser, status: "created" };
    }

    const updates: Partial<UserRow> = {};
    
    if (verifiedData.wallet_address && verifiedData.wallet_address !== existingUser.wallet_address) {
      updates.wallet_address = verifiedData.wallet_address;
    }
    if (verifiedData.email && verifiedData.email !== existingUser.email) {
      updates.email = verifiedData.email;
    }
    updates.last_login_at = new Date().toISOString();

    if (Object.keys(updates).length > 1) {
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update(updates)
        .eq("privy_user_id", did)
        .select()
        .single();

      if (updateError) throw updateError;
      return { user: updatedUser, status: "updated" };
    }

    return { user: existingUser, status: "no_change" };
  }

  static async ensureWalletExists(walletAddress: string) {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        { 
          wallet_address: walletAddress,
          auth_method: 'wallet',
          auth_identifier: walletAddress 
        },
        { onConflict: "wallet_address" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }
  static async getTotalUserCount(): Promise<number> {
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}
}