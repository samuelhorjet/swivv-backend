import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { env } from "../../config/env.js";
import { PoolModel } from "../../models/Pool.js";
import { PredictionModel } from "../../models/Prediction.js";
import { UserModel } from "../../models/User.js";
import {
  SEED_POOL,
  SEED_POOL_VAULT,
  SEED_PROTOCOL,
} from "../../utils/constants.js";

import idl from "./idl/swiv_privacy.json" with { type: "json" };
import type { SwivPrivacy } from "./idl/swiv_privacy.js";
import { LeaderboardService } from "../leaderboard.service.js";
import { supabase } from "../../config/supabaseClient.js";
import { ProtocolModel } from "../../models/Protocol.js";

export class ContractService {
  private connection: Connection;
  private wallet: Wallet;
  private provider: AnchorProvider;
  public program: Program<SwivPrivacy>;

  constructor() {
    this.connection = new Connection(env.rpcUrl, "confirmed");
    this.wallet = new Wallet(this.loadBackendKeypair());
    this.provider = new AnchorProvider(this.connection, this.wallet, {
      commitment: "confirmed",
    });
    this.program = new Program(idl as unknown as SwivPrivacy, this.provider);

    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // 1. POOL CREATED
    this.program.addEventListener(
      "poolCreated",
      async (event, slot, signature) => {
        console.log(
          `Pool Created: ${event.poolName}. Fetching details via transaction...`,
        );
        // We perform a small delay to ensure RPC is indexed, then sync all
        setTimeout(() => this.syncAllPools(), 2000);
      },
    );

    // 2. BET PLACED / UPDATED
    const handleBetEvent = async (event: any) => {
      console.log(
        `Bet Event detected for address: ${event.betAddress.toBase58()}`,
      );
      await this.syncSpecificBet(event.betAddress);
    };

    this.program.addEventListener("betPlaced", handleBetEvent);
    this.program.addEventListener("betUpdated", handleBetEvent);
    this.program.addEventListener("betDelegated", handleBetEvent);

    // 3. POOL RESOLVED / FINALIZED
    this.program.addEventListener("poolResolved", () => this.syncAllPools());
    this.program.addEventListener("weightsFinalized", async (event) => {
      await this.syncAllPools();
      this.program.addEventListener("rewardClaimed", async (event) => {
        console.log(
          `💰 Reward Claimed: ${event.user.toBase58()} took ${Number(event.amount) / 1e6} USDC`,
        );
        await this.syncSpecificBet(event.betAddress);
        await LeaderboardService.updateEarnings(
          event.user.toBase58(),
          event.amount.toString(),
        );
      });
    });
    this.program.addEventListener("configUpdated", async () => {
        console.log("⚙️ Protocol Config Updated on-chain. Syncing...");
        await this.syncProtocolState();
    });

    this.program.addEventListener("pauseChanged", async (event) => {
        console.log(`⚠️ Protocol Paused State Changed: ${event.isPaused}`);
        await this.syncProtocolState();
    });
  }

  public async runInitialFullSync() {
    console.log("🔄 Starting Initial Full Sync...");
    await this.syncProtocolState();
    await this.syncAllPools();
    await this.syncAllBets();
    console.log("🏁 Initial Full Sync Complete.");
  }

  public async syncAllBets() {
    try {
      const allBets = await this.program.account.userBet.all();
      console.log(`🔎 Found ${allBets.length} bets on-chain. Checking DB...`);

      // 1. Get all Bet Pubkeys we already have in DB
      const { data: existingBets } = await supabase
        .from("predictions")
        .select("bet_pubkey");

      const existingSet = new Set(existingBets?.map((b) => b.bet_pubkey));

      // 2. Filter: Only process bets we DON'T have
      const newBets = allBets.filter(
        (b) => !existingSet.has(b.publicKey.toBase58()),
      );

      if (newBets.length === 0) {
        console.log("✅ No new bets to sync.");
        return;
      }

      console.log(`📥 Syncing ${newBets.length} NEW bets...`);

      for (const b of newBets) {
        await this.syncSpecificBet(b.publicKey);
      }
    } catch (error) {
      console.error("❌ Global Bet Sync Error:", error);
    }
  }

  public getBackendKeypair(): Keypair {
    return (this.wallet as any).payer;
  }

  public getConnection(): Connection {
    return (this.program.provider as AnchorProvider).connection;
  }

  public async syncAllPools() {
    try {
      console.log("🔄 Fetching pools from chain...");
      const allOnChainPools = await this.program.account.pool.all();

      const { data: dbPools } = await supabase
        .from("pools")
        .select("pool_pubkey, status");

      const dbPoolMap = new Map<string, string>();
      dbPools?.forEach((p) => dbPoolMap.set(p.pool_pubkey, p.status));

      const poolsToSync = allOnChainPools.filter((p) => {
        const pubkey = p.publicKey.toBase58();
        const dbStatus = dbPoolMap.get(pubkey);
        if (!dbStatus) return true;
        if (dbStatus === "active" || dbStatus === "resolved") return true;
        return false;
      });

      if (poolsToSync.length === 0) {
        console.log("✅ Pools are up to date. No active changes found.");
        return;
      }

      console.log(`⚡ Syncing ${poolsToSync.length} pools (New or Active)...`);

      for (const p of poolsToSync) {
        const acc = p.account;

        const [vaultPda] = PublicKey.findProgramAddressSync(
          [SEED_POOL_VAULT, p.publicKey.toBuffer()],
          this.program.programId,
        );

        let assetSymbol: string | null = null;
        let category: string = "custom";
        let pythFeedId: string | null = null; 
        let assetDecimals: number | null = null;
        let imageUrl: string | null = null;

        if (acc.metadata) {
          try {
            const metaObj = JSON.parse(acc.metadata);
            if (metaObj.symbol) assetSymbol = metaObj.symbol;
            if (metaObj.category) category = metaObj.category;
            if (metaObj.pyth_feed_id) pythFeedId = metaObj.pyth_feed_id;
            if (metaObj.asset_decimals) assetDecimals = metaObj.asset_decimals;
            if (metaObj.image) imageUrl = metaObj.image;
          } catch (e) {
            console.warn(`Could not parse metadata for pool ${acc.poolId}`);
          }
        }

        await PoolModel.upsertPool({
          pool_pubkey: p.publicKey.toBase58(),
          pool_id: acc.poolId.toNumber(),
          admin: acc.admin.toBase58(),
          name: acc.name,
          asset_symbol: assetSymbol,
          image_url: imageUrl,
          pyth_feed_id: pythFeedId,
          asset_decimals: assetDecimals,
          token_mint: acc.tokenMint.toBase58(),
          start_time: acc.startTime.toNumber(),
          end_time: acc.endTime.toNumber(),
          vault_balance: acc.vaultBalance.toString(),
          total_weight: acc.totalWeight.toString(),
          max_accuracy_buffer: acc.maxAccuracyBuffer.toString(),
          conviction_bonus_bps: acc.convictionBonusBps.toNumber(),
          resolution_target: acc.resolutionTarget.toString(),
          is_resolved: acc.isResolved,
          resolution_ts: acc.resolutionTs.toNumber(),
          weight_finalized: acc.weightFinalized,
          total_participants: acc.totalParticipants.toNumber(),
          vault_pubkey: vaultPda.toBase58(),
          metadata: acc.metadata || undefined,
          status: acc.weightFinalized
            ? "settled"
            : acc.isResolved
              ? "resolved"
              : Date.now() / 1000 > acc.endTime.toNumber()
                ? "closed"
                : "active",
        });
      }
      console.log(`✅ Update complete.`);
    } catch (error) {
      console.error("❌ Pool Sync Error:", error);
    }
  }

  public async syncSpecificBet(betAddress: PublicKey) {
    try {
      const acc = await this.program.account.userBet.fetch(betAddress);

      // Ensure user exists in DB
      await UserModel.ensureWalletExists(acc.owner.toBase58());

      // Find the integer pool_id from the pool account
      const poolAccount = await this.program.account.pool.fetch(acc.pool);

      // Map Rust Enum (BetStatus) to String
      // Anchor enums look like: { active: {} }
      if (!acc.status) {
        // Handle the error or provide a default status
        throw new Error("Account status is missing from the blockchain data");
      }

      // 2. Now that TS knows it is defined, you can get the key safely
      const statusKey = Object.keys(acc.status)[0]?.toLowerCase() ?? "unknown";

      await PredictionModel.upsertPrediction({
        bet_pubkey: betAddress.toBase58(),
        user_wallet: acc.owner.toBase58(),
        pool_pubkey: acc.pool.toBase58(),
        pool_id: poolAccount.poolId.toNumber(),
        deposit: acc.deposit.toString(),
        prediction: acc.prediction.toString(),
        calculated_weight: acc.calculatedWeight.toString(),
        is_weight_added: acc.isWeightAdded,
        status: statusKey as any,
        creation_ts: acc.creationTs.toNumber(),
        end_timestamp: acc.endTimestamp.toNumber(),
        update_count: acc.updateCount,
      });
    } catch (error) {
      console.error("❌ Bet Sync Error:", error);
    }
  }

  // ... inside ContractService class
  public async syncProtocolState() {
    try {
      const [protocolPda] = PublicKey.findProgramAddressSync(
        [SEED_PROTOCOL],
        this.program.programId
      );
      
      const acc = await this.program.account.protocol.fetch(protocolPda);
      
      // Import ProtocolModel at the top of file first!
      await ProtocolModel.upsertProtocol({
        admin: acc.admin.toBase58(),
        treasury_wallet: acc.treasuryWallet.toBase58(),
        protocol_fee_bps: acc.protocolFeeBps.toNumber(),
        paused: acc.paused,
        total_users: acc.totalUsers.toNumber(),
        total_pools: acc.totalPools.toNumber()
      });
      console.log("✅ Protocol State Synced.");
    } catch (error) {
      console.error("❌ Protocol Sync Error:", error);
    }
  }

  private loadBackendKeypair(): Keypair {
    const keypairPath = path.resolve(process.cwd(), "keypair.json");
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8"))),
    );
  }
}

export const contractService = new ContractService();
