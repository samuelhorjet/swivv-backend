import { HermesClient } from "@pythnetwork/hermes-client";

export class OracleService {
  private static client = new HermesClient("https://hermes.pyth.network", {});

  static async getPriceById(feedId: string): Promise<number> {
    try {
      if (!feedId) throw new Error("Feed ID is missing");
      const priceUpdates = await this.client.getLatestPriceUpdates([feedId]);

      if (!priceUpdates || !priceUpdates.parsed || priceUpdates.parsed.length === 0) {
        throw new Error("Empty response from Pyth Hermes");
      }

      const firstUpdate = priceUpdates.parsed[0];

      if (!firstUpdate) {
        throw new Error("Failed to retrieve the first update from array");
      }

      if (!firstUpdate.price) {
        throw new Error(`Pyth response is missing price data for feed: ${feedId}`);
      }

      const { price, expo } = firstUpdate.price;

      const humanPrice = Number(price) * Math.pow(10, expo);
      return humanPrice;

    } catch (error) {
      console.error(`❌ Pyth Fetch Error:`, error);
      throw error;
    }
  }
}