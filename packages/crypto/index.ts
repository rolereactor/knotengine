import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { BIP32Factory, BIP32Interface } from "bip32";
import { ethers } from "ethers";
import * as crypto from "crypto";
import type {
  LightningConfig,
  LightningInvoice,
  LightningPayment,
  LightningWalletBalance,
  LightningPeer,
  LightningProvider,
} from "./src/lightning/types.js";
import { LndProvider } from "./src/lightning/lnd-provider.js";
import { ClnProvider } from "./src/lightning/cln-provider.js";

const bip32 = BIP32Factory(ecc);

export { LndProvider, ClnProvider };

export type {
  LightningConfig,
  LightningInvoice,
  LightningPayment,
  LightningWalletBalance,
  LightningPeer,
  LightningProvider,
};

export class Derivator {
  /**
   * Derives a Bitcoin (SegWit P2WPKH) address from an xPub and index.
   * Standard: BIP44/BIP84 style derivation for external addresses.
   */
  private static getNetwork(networkName: string): bitcoin.networks.Network {
    if (networkName === "litecoin") {
      return {
        messagePrefix: "\x19Litecoin Signed Message:\n",
        bech32: "ltc",
        bip32: {
          public: 0x019da462,
          private: 0x019d9cfe,
        },
        pubKeyHash: 0x30,
        scriptHash: 0x32,
        wif: 0xb0,
      };
    }
    if (networkName === "litecoin-testnet") {
      return {
        messagePrefix: "\x19Litecoin Signed Message:\n",
        bech32: "tltc",
        bip32: {
          public: 0x043587cf,
          private: 0x04358394,
        },
        pubKeyHash: 0x6f,
        scriptHash: 0x3a,
        wif: 0xef,
      };
    }
    return (
      bitcoin.networks[networkName as keyof typeof bitcoin.networks] ||
      bitcoin.networks.bitcoin
    );
  }

  /**
   * Derives a UTXO-based address (BTC/LTC) from an xPub and index.
   * Standard: BIP44/BIP84 style derivation for external addresses.
   */
  public static deriveUTXOAddress(
    xpub: string,
    index: number,
    targetNetworkName: "bitcoin" | "testnet" | "litecoin" | "litecoin-testnet",
  ): string {
    const targetNetwork = this.getNetwork(targetNetworkName);

    // Determine the network for decoding the xPub based on its prefix
    // Standard xpub/ypub/zpub starts with 'x', 'y', 'z'
    // Testnet tpub/upub/vpub starts with 't', 'u', 'v'
    const isTestnetXpub = /^[tuv]pub/i.test(xpub);
    const xpubNetwork = isTestnetXpub
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin;

    const node: BIP32Interface = bip32.fromBase58(xpub, xpubNetwork);
    const child = node.derive(0).derive(index);

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: targetNetwork,
    });

    if (!address)
      throw new Error(`Failed to derive ${targetNetworkName} address`);
    return address;
  }

  /**
   * @deprecated Use deriveUTXOAddress instead
   */
  public static deriveBitcoinAddress(
    xpub: string,
    index: number,
    networkName: "bitcoin" | "testnet" | "regtest" = "bitcoin",
  ): string {
    return this.deriveUTXOAddress(
      xpub,
      index,
      networkName as "bitcoin" | "testnet",
    );
  }

  /**
   * Derives an Ethereum/EVM address from an xPub and index.
   * Note: For EVM, usually merchants use a single address, but BIP44 derivation
   * allows for one-address-per-order privacy.
   */
  public static deriveEthereumAddress(xpub: string, index: number): string {
    const node: BIP32Interface = bip32.fromBase58(xpub);
    const child = node.derive(0).derive(index);

    // Convert public key to Ethereum address
    // We use ethers.computeAddress which handles the public key to address conversion
    const publicKey = child.publicKey.toString("hex");
    return ethers.computeAddress("0x" + publicKey);
  }

  /**
   * Signs a payload with a secret key using HMAC-SHA256.
   * Used for secure Webhook notifications.
   */
  public static signWebhookPayload(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Verifies a webhook signature.
   */
  public static verifyWebhookSignature(
    signature: string,
    payload: string,
    secret: string,
  ): boolean {
    const expectedSignature = this.signWebhookPayload(payload, secret);
    const source = Buffer.from(signature, "hex");
    const target = Buffer.from(expectedSignature, "hex");

    if (source.length !== target.length) {
      return false;
    }

    return crypto.timingSafeEqual(source, target);
  }
}
