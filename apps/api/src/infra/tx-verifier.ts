import { ethers } from "ethers";
import { Currency } from "@qodinger/knot-types";
import { childLogger } from "./logger.js";

export class TxVerifier {
  // Transfer(address,address,uint256)
  private static readonly TRANSFER_EVENT_SIG =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

  /**
   * Verifies a transaction on-chain and returns the amount of crypto sent
   * to the expected platform wallet address.
   */
  public static async verifyTx(
    txHash: string,
    currency: Currency,
    expectedToAddress: string,
  ): Promise<{ isValid: boolean; amountCrypto: number }> {
    try {
      if (currency === "BTC") {
        return await this.verifyBitcoinTx(txHash, expectedToAddress);
      } else if (currency === "LTC") {
        return await this.verifyLitecoinTx(txHash, expectedToAddress);
      } else if (
        currency === "ETH" ||
        currency === "USDT_ERC20" ||
        currency === "USDT_POLYGON" ||
        currency === "USDC_ERC20" ||
        currency === "USDC_POLYGON"
      ) {
        return await this.verifyEvmTx(txHash, currency, expectedToAddress);
      }
      return { isValid: false, amountCrypto: 0 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      childLogger("tx-verifier").error(
        `TxVerifier Error (${currency}): ${message}`,
      );
      return { isValid: false, amountCrypto: 0 };
    }
  }

  private static async verifyBitcoinTx(
    txHash: string,
    expectedToAddress: string,
  ) {
    const network = process.env.BITCOIN_NETWORK === "testnet" ? "testnet/" : "";
    const response = await fetch(
      `https://mempool.space/${network}api/tx/${txHash}`,
    );

    if (!response.ok) return { isValid: false, amountCrypto: 0 };
    const data = await response.json();

    let totalSats = 0;
    for (const vout of data.vout || []) {
      if (vout.scriptpubkey_address === expectedToAddress) {
        totalSats += vout.value;
      }
    }

    if (totalSats > 0) {
      return { isValid: true, amountCrypto: totalSats / 1e8 }; // Convert satoshis to BTC
    }
    return { isValid: false, amountCrypto: 0 };
  }

  private static async verifyLitecoinTx(
    txHash: string,
    expectedToAddress: string,
  ) {
    // litecoinspace.org works identical to mempool.space API
    const response = await fetch(`https://litecoinspace.org/api/tx/${txHash}`);

    if (!response.ok) return { isValid: false, amountCrypto: 0 };
    const data = await response.json();

    let totalLits = 0;
    for (const vout of data.vout || []) {
      if (vout.scriptpubkey_address === expectedToAddress) {
        totalLits += vout.value;
      }
    }

    if (totalLits > 0) {
      return { isValid: true, amountCrypto: totalLits / 1e8 }; // Convert litoshis to LTC
    }
    return { isValid: false, amountCrypto: 0 };
  }

  private static async verifyEvmTx(
    txHash: string,
    currency:
      | "ETH"
      | "USDT_ERC20"
      | "USDT_POLYGON"
      | "USDC_ERC20"
      | "USDC_POLYGON",
    expectedToAddress: string,
  ) {
    let rpcUrl = "";
    if (currency === "USDT_POLYGON" || currency === "USDC_POLYGON") {
      rpcUrl = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    } else {
      rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    }

    if (!process.env.ALCHEMY_API_KEY) {
      childLogger("tx-verifier").warn("TxVerifier: ALCHEMY_API_KEY missing");
      return { isValid: false, amountCrypto: 0 };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    if (currency === "ETH") {
      // Check native ETH transfer
      const tx = await provider.getTransaction(txHash);
      if (!tx || !tx.to) return { isValid: false, amountCrypto: 0 };

      if (tx.to.toLowerCase() === expectedToAddress.toLowerCase()) {
        const amountCrypto = parseFloat(ethers.formatEther(tx.value));
        return { isValid: amountCrypto > 0, amountCrypto };
      }
    } else {
      // Check ERC20 token transfer (USDT / USDC)
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt || receipt.status === 0)
        return { isValid: false, amountCrypto: 0 }; // Reverted

      // Find Transfer events to the expected address
      let totalTokens = 0;
      const expectedToPadded = ethers.zeroPadValue(
        expectedToAddress.toLowerCase(),
        32,
      );

      for (const log of receipt.logs) {
        if (
          log.topics[0] === this.TRANSFER_EVENT_SIG &&
          log.topics[2] && // to
          log.topics[2].toLowerCase() === expectedToPadded
        ) {
          // Check contract addresses for correctness
          const usdtEth = "0xdac17f958d2ee523a2206206994597c13d831ec7";
          const usdtPolygon = "0xc2132d05d31c914a87c6611c10748aeb04b58e8f";
          const usdcEth = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
          const usdcPolygon = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359";

          const validContract =
            currency === "USDT_POLYGON"
              ? usdtPolygon
              : currency === "USDC_POLYGON"
                ? usdcPolygon
                : currency === "USDC_ERC20"
                  ? usdcEth
                  : usdtEth;

          if (log.address.toLowerCase() === validContract.toLowerCase()) {
            // USDT and USDC on Ethereum both use 6 decimals
            const amountBN = ethers.formatUnits(log.data, 6);
            totalTokens += parseFloat(amountBN);
          }
        }
      }

      if (totalTokens > 0) {
        return { isValid: true, amountCrypto: totalTokens };
      }
    }

    return { isValid: false, amountCrypto: 0 };
  }
}
