import { supabase } from "../config/supabaseClient.js";

export class LeaderboardService {
  static async updateLeaderboardForPool(poolId: number) {
    console.log(`Updating leaderboard stats for pool ${poolId}...`);

    const { data: bets, error } = await supabase
      .from("predictions")
      .select("user_wallet, deposit, status, calculated_weight")
      .eq("pool_id", poolId);

    if (error || !bets) return;

    for (const bet of bets) {
      const isWin = Number(bet.calculated_weight) > 0;
      
      const { data: current } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("user_wallet", bet.user_wallet)
        .maybeSingle();

      await supabase.from("leaderboard").upsert({
        user_wallet: bet.user_wallet,
        total_predictions: (current?.total_predictions || 0) + 1,
        wins: (current?.wins || 0) + (isWin ? 1 : 0),
        losses: (current?.losses || 0) + (isWin ? 0 : 1),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_wallet' });
    }
  }

  static async updateEarnings(userWallet: string, amountRaw: string) {
    const amount = Number(amountRaw) / 1e6;

    const { data: current } = await supabase
      .from("leaderboard")
      .select("earnings")
      .eq("user_wallet", userWallet)
      .maybeSingle();

    const newTotal = (current?.earnings || 0) + amount;

    const { error } = await supabase
      .from("leaderboard")
      .upsert({
        user_wallet: userWallet,
        earnings: newTotal,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_wallet' });

    if (error) console.error("Leaderboard Earnings Error:", error.message);
  }

  static async updateWinLoss(userWallet: string, isWin: boolean) {
    const { data: current } = await supabase
      .from("leaderboard")
      .select("wins, losses, total_predictions")
      .eq("user_wallet", userWallet)
      .maybeSingle();

    await supabase.from("leaderboard").upsert({
      user_wallet: userWallet,
      total_predictions: (current?.total_predictions || 0) + 1,
      wins: (current?.wins || 0) + (isWin ? 1 : 0),
      losses: (current?.losses || 0) + (isWin ? 0 : 1),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_wallet' });
  }
}