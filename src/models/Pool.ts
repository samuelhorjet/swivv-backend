import { supabase } from "../config/supabaseClient.js";

export interface PoolData {
  pool_id: number;
  admin: string;
  name: string;
  token_mint: string;
  start_time: number;
  end_time: number;
  vault_balance: string;
  total_weight: string;
  max_accuracy_buffer: number;
  conviction_bonus_bps: number;
  resolution_target: string;
  is_resolved: boolean;
  resolution_ts: number;
  weight_finalized: boolean;
  total_participants: number;
  pool_pubkey: string;
  vault_pubkey: string;
  metadata?: string | undefined;
  status: "active" | "resolved" | "settled" | "closed";
}

export class PoolModel {
  static async upsertPool(data: any) {
    const { error } = await supabase
      .from("pools")
      .upsert(data, { onConflict: "pool_id" });
    if (error) throw error;
  }

  static async getAllVisible() {
    const { data, error } = await supabase
      .from("pools")
      .select("*")
      .eq("is_hidden", false)
      .order("start_time", { ascending: false });

    if (error) throw error;
    return data;
  }

  static async hidePool(poolPubkey: string) {
    const { error } = await supabase
      .from("pools")
      .update({ is_hidden: true })
      .eq("pool_pubkey", poolPubkey);

    if (error) throw error;
  }
  static async getTotalPoolCount(): Promise<number> {
    const { count, error } = await supabase
      .from("pools")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    return count || 0;
  }
}
