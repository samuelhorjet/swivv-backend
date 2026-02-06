import { supabase } from "../../config/supabaseClient.js";
import { contractService } from "./contract.service.js";
import { OracleService } from "../oracle.service.js";
import { SEED_PROTOCOL } from "../../utils/constants.js";
import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import BN from "bn.js";

export class PoolResolutionService {
  
  static async resolveExpiredPools() {
    const now = Math.floor(Date.now() / 1000);
    
    const { data: pools, error } = await supabase
      .from("pools")
      .select("*") 
      .eq("status", "active")
      .lt("end_time", now);

    if (error || !pools) return;

    for (const pool of pools) {
      if (!pool.pyth_feed_id || pool.asset_decimals === undefined) {
        console.warn(`⚠️ Skipping Pool ${pool.pool_id}: Missing Pyth Feed ID or Asset Decimals in DB.`);
        continue;
      }

      await this.executeResolution(pool);
    }
  }

  private static async executeResolution(pool: any) {
    try {
      console.log(`Processing Auto-Resolution for Pool: ${pool.name}`);

      const price = await OracleService.getPriceById(pool.pyth_feed_id);
      
      const scaledPrice = new BN(Math.round(price * Math.pow(10, pool.asset_decimals)));

      console.log(`📉 Price: $${price} | Scaling to ${pool.asset_decimals} decimals -> ${scaledPrice.toString()}`);

      const [protocolPda] = PublicKey.findProgramAddressSync(
        [SEED_PROTOCOL],
        contractService.program.programId
      );

      const backendKeypair = contractService.getBackendKeypair();
      const connection = contractService.getConnection();

      const ix = await contractService.program.methods
        .resolvePool(scaledPrice)
        .accountsPartial({
          admin: backendKeypair.publicKey, 
          protocol: protocolPda,
          pool: new PublicKey(pool.pool_pubkey),
        })
        .instruction();

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: backendKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions: [ix],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([backendKeypair]);

      const signature = await connection.sendTransaction(transaction, { maxRetries: 5 });

      console.log(`⏳ Tx Sent: ${signature}`);

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) throw new Error("Transaction failed on-chain");

      await supabase
        .from("pools")
        .update({ 
          status: 'resolved', 
          final_outcome: scaledPrice.toString(),
          resolution_signature: signature 
        })
        .eq("pool_id", pool.pool_id);

      console.log(`✅ Pool ${pool.pool_id} Resolved!`);

    } catch (error) {
      console.error(`❌ Failed to resolve pool ${pool.pool_id}:`, error);
    }
  }
}