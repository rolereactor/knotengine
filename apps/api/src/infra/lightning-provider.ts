import { LndProvider, ClnProvider } from "@qodinger/knot-crypto";
import type { LightningProvider, LightningConfig } from "@qodinger/knot-crypto";
import { IMerchant } from "@qodinger/knot-database";

export function createLightningProvider(
  merchant: IMerchant,
): LightningProvider | null {
  if (!merchant.lightningEnabled) return null;

  const provider = merchant.lightningProvider || "lnd";

  if (provider === "lnd") {
    if (!merchant.lndEndpoint) return null;

    const url = new URL(merchant.lndEndpoint);
    const config: LightningConfig = {
      provider: "lnd",
      host: url.hostname,
      port: parseInt(url.port || (url.protocol === "https:" ? "443" : "80")),
      macaroon: merchant.lndMacaroon,
      cert: merchant.lndCert,
      invoiceExpiry: 3600,
    };

    return new LndProvider(config);
  }

  if (provider === "cln") {
    if (!merchant.clnEndpoint) return null;

    const url = new URL(merchant.clnEndpoint);
    const config: LightningConfig = {
      provider: "cln",
      host: url.hostname,
      port: parseInt(url.port || "9735"),
      macaroon: merchant.clnRune,
      invoiceExpiry: 3600,
    };

    return new ClnProvider(config);
  }

  return null;
}
