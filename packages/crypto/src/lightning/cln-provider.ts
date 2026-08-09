import type {
  LightningConfig,
  LightningInvoice,
  LightningPayment,
  LightningProvider,
  LightningPeer,
  LightningWalletBalance,
} from "./types.js";

interface ClnCreateInvoiceResponse {
  payment_hash: string;
  payment_request: string;
  expires_at: number;
}

interface ClnListpaysResponse {
  pays: Array<{
    payment_hash: string;
    payment_request: string;
    preimage?: string;
    amount_sent_msat: string;
    amount_msat: string;
    status: string;
    bolt11: string;
    created_at: number;
    completed_at?: number;
    failure_reason?: string;
  }>;
}

interface ClnGetinfoResponse {
  balance: string;
  channels_active: number;
  channels_inactive: number;
  fees_proportional_millionths: number;
  id: string;
  network: string;
  version: string;
  blockheight: number;
  address: Array<{
    type: string;
    address: string;
    port: number;
  }>;
}

interface ClnConnectResponse {
  id: string;
  alias: string;
  color: string;
  features: string[];
}

interface ClnListpeersResponse {
  peers: Array<{
    id: string;
    connected: boolean;
    channels: Array<{
      channel_id: string;
      our_amount_msat: string;
      state: string;
    }>;
    address?: string;
    alias?: string;
    color?: string;
  }>;
}

export class ClnProvider implements LightningProvider {
  private readonly url: string;
  private readonly rpcFile?: string;

  constructor(config: LightningConfig) {
    this.url = `http://${config.host}:${config.port}/rpc`;
    this.rpcFile = config.macaroon;
  }

  private async request<T>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.rpcFile) {
      headers["X-Access"] = this.rpcFile;
    }

    const response = await fetch(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`CLN RPC error (${response.status}): ${error}`);
    }

    const result = (await response.json()) as {
      result?: T;
      error?: { code: number; message: string };
    };

    if (result.error) {
      throw new Error(`CLN RPC error: ${result.error.message}`);
    }

    return result.result as T;
  }

  async createInvoice(
    amount: number,
    description: string,
    expiry?: number,
  ): Promise<LightningInvoice> {
    const params: Record<string, unknown> = {
      amount_msat: amount * 1000,
      label: `invoice_${Date.now()}`,
      description,
    };

    if (expiry) {
      params.expiry = expiry;
    }

    const data = await this.request<ClnCreateInvoiceResponse>(
      "invoice",
      params,
    );

    return {
      paymentHash: data.payment_hash,
      paymentRequest: data.payment_request,
      description,
      amount,
      fee: 0,
      status: "pending",
      expiresAt: new Date(data.expires_at * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  async lookupPayment(paymentHash: string): Promise<LightningPayment> {
    const data = await this.request<ClnListpaysResponse>("listpays", {
      payment_hash: paymentHash,
    });

    if (data.pays.length === 0) {
      throw new Error(`Payment not found: ${paymentHash}`);
    }

    const pay = data.pays[0];

    let status: LightningPayment["status"];
    switch (pay.status) {
      case "complete":
        status = "succeeded";
        break;
      case "pending":
        status = "pending";
        break;
      case "failed":
        status = "failed";
        break;
      default:
        status = "pending";
    }

    const amountMsat = pay.amount_msat
      ? Number(pay.amount_msat.replace("msat", ""))
      : Number(pay.amount_sent_msat.replace("msat", ""));

    return {
      paymentHash: pay.payment_hash,
      paymentRequest: pay.bolt11,
      preimage: pay.preimage,
      amount: Math.floor(amountMsat / 1000),
      fee: Math.floor(
        (Number(pay.amount_sent_msat.replace("msat", "")) - amountMsat) / 1000,
      ),
      status,
      failureReason: pay.failure_reason,
      createdAt: new Date(pay.created_at * 1000).toISOString(),
      completedAt: pay.completed_at
        ? new Date(pay.completed_at * 1000).toISOString()
        : undefined,
    };
  }

  async getWalletBalance(): Promise<LightningWalletBalance> {
    const data = await this.request<ClnGetinfoResponse>("getinfo");

    return {
      balance: Math.floor(Number(data.balance)),
      pending: 0,
      reserved: 0,
      currency: "BTC",
    };
  }

  async connectPeer(uri: string): Promise<LightningPeer> {
    const data = await this.request<ClnConnectResponse>("connect", {
      id: uri,
    });

    const peersData = await this.request<ClnListpeersResponse>("listpeers", {
      id: data.id,
    });

    const peer = peersData.peers.find((p) => p.id === data.id);
    const channels = peer?.channels?.length ?? 0;

    const totalCapacity =
      peer?.channels?.reduce((sum, ch) => {
        const amount = ch.our_amount_msat
          ? Number(ch.our_amount_msat.replace("msat", ""))
          : 0;
        return sum + Math.floor(amount / 1000);
      }, 0) ?? 0;

    return {
      publicKey: data.id,
      address: peer?.address ?? uri,
      alias: data.alias,
      color: data.color,
      channels,
      capacity: totalCapacity,
    };
  }
}
