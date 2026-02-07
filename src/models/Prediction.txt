import { supabase } from "../config/supabaseClient.js";

export interface PredictionData {
  user_wallet: string;
  pool_id: number;
  pool_pubkey: string;
  request_id?: string;
  bet_pubkey: string;
  deposit: string;
  prediction: string;
  calculated_weight: string;
  is_weight_added: boolean;
  status: "initialized" | "active" | "calculated" | "claimed";
  creation_ts: number;
  end_timestamp: number;
  update_count: number;
}

export class PredictionModel {
  static async upsertPrediction(data: any) {
    const { data: existing } = await supabase
      .from("predictions")
      .select("status")
      .eq("bet_pubkey", data.bet_pubkey)
      .maybeSingle();

    const { data: bet, error } = await supabase
      .from("predictions")
      .upsert(data, { onConflict: "bet_pubkey" })
      .select()
      .single();

    if (error) throw error;

    if (data.status === "active" && existing?.status !== "active") {
      await supabase.from("activity").insert({
        user_wallet: bet.user_wallet,
        type: "bet_placed",
        description: `Placed a ${Number(bet.deposit) / 1e6} USDC bet on pool #${bet.pool_id}`,
        metadata: { bet_pubkey: bet.bet_pubkey, amount: bet.deposit },
      });
    }

    return bet;
  }

  static async findByUser(walletAddress: string) {
    const { data, error } = await supabase
      .from("predictions")
      .select(
        `
        *,
        pools (name, status) 
      `,
      )
      .eq("user_wallet", walletAddress)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  static async findByPool(poolPubkey: string) {
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("pool_pubkey", poolPubkey)
      .order("deposit", { ascending: false });

    if (error) throw error;
    return data;
  }
  static async getGlobalBetStats() {
    const { data, error } = await supabase
      .from("predictions")
      .select("deposit");

    if (error) throw error;

    const totalVolume = data.reduce(
      (sum, item) => sum + Number(item.deposit),
      0,
    );
    const totalBets = data.length;

    return { totalVolume, totalBets };
  }
}
