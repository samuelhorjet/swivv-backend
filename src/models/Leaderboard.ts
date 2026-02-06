import { supabase } from "../config/supabaseClient.js";

export class LeaderboardModel {
  static async getTopEarners(limit = 10) {
    const { data, error } = await supabase
      .from("leaderboard")
      .select(`
        earnings,
        wins,
        losses,
        user_wallet,
        users (username, avatar_url)
      `)
      .order("earnings", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async getTopDepositors(limit = 10) {
    const { data, error } = await supabase
      .from("predictions")
      .select("user_wallet, deposit")
      
    if (error) throw error;
    const aggregation = data.reduce((acc: any, curr) => {
      const wallet = curr.user_wallet;
      acc[wallet] = (acc[wallet] || 0) + (Number(curr.deposit) / 1e6);
      return acc;
    }, {});

    return Object.entries(aggregation)
      .map(([wallet, total]) => ({ wallet, totalDeposit: total }))
      .sort((a, b) => (b.totalDeposit as number) - (a.totalDeposit as number))
      .slice(0, limit);
  }
}