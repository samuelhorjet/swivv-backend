import { supabase } from "../config/supabaseClient.js";

export class ProtocolModel {
  static async upsertProtocol(data: {
    admin: string;
    treasury_wallet: string;
    protocol_fee_bps: number;
    paused: boolean;
    total_users: number;
    total_pools: number;
  }) {
    const { error } = await supabase
      .from("protocol")
      .upsert({ ...data, id: 'singleton' }); 

    if (error) throw error;
  }

  static async getConfig() {
    const { data, error } = await supabase
      .from("protocol")
      .select("*")
      .eq("id", "singleton")
      .single();

    if (error) throw error;
    return data;
  }
}