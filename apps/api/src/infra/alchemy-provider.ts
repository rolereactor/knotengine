import { IBlockchainProvider } from "./provider-interface.js";

/**
 * ⚗️ Alchemy Notify Provider
 *
 * Provides redundancy for EVM chains (Ethereum, Polygon, Arbitrum, etc.)
 * Note: Alchemy does not support UTXO chains like BTC/LTC for webhooks.
 */
export class AlchemyProvider implements IBlockchainProvider {
  public readonly name = "alchemy";

  public async subscribeAddress(
    address: string,
    chain: string,
    _webhookUrl: string,
  ): Promise<string | null> {
    const authToken = process.env.ALCHEMY_AUTH_TOKEN;
    const webhookId = process.env.ALCHEMY_NOTIFY_WEBHOOK_ID;

    // Alchemy only supports EVM monitoring via this method
    const supportedChains = [
      "ETH",
      "USDT_ERC20",
      "USDT_POLYGON",
      "USDC_ERC20",
      "USDC_POLYGON",
      "MATIC",
    ];
    if (!supportedChains.includes(chain)) {
      return null;
    }

    if (!authToken || !webhookId) {
      console.warn(
        "⚠️ AlchemyProvider: ALCHEMY_AUTH_TOKEN or ALCHEMY_NOTIFY_WEBHOOK_ID missing.",
      );
      return null;
    }

    try {
      console.log(`⚗️ Alchemy: Adding ${address} to webhook ${webhookId}`);

      const response = await fetch(
        "https://dashboard.alchemy.com/api/update-webhook-addresses",
        {
          method: "PATCH",
          headers: {
            "X-Alchemy-Token": authToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook_id: webhookId,
            addresses_to_add: [address],
            addresses_to_remove: [],
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("❌ Alchemy Notify Error:", error);
        return null;
      }

      // In Alchemy, the subscription ID is essentially the address itself
      // since we add/remove addresses from a single webhook container.
      return `alchemy_${address}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ Alchemy Provider Error:", message);
      return null;
    }
  }

  public async deleteSubscription(subscriptionId: string): Promise<void> {
    const authToken = process.env.ALCHEMY_AUTH_TOKEN;
    const webhookId = process.env.ALCHEMY_NOTIFY_WEBHOOK_ID;

    if (!authToken || !webhookId || !subscriptionId.startsWith("alchemy_")) {
      return;
    }

    const address = subscriptionId.replace("alchemy_", "");

    try {
      await fetch(
        "https://dashboard.alchemy.com/api/update-webhook-addresses",
        {
          method: "PATCH",
          headers: {
            "X-Alchemy-Token": authToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook_id: webhookId,
            addresses_to_add: [],
            addresses_to_remove: [address],
          }),
        },
      );
      console.log(`🗑️ Alchemy: Removed address ${address} from webhook`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ Alchemy Delete Error:", message);
    }
  }
}
