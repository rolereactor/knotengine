import type {
  LightningConfig,
  LightningInvoice,
  LightningPayment,
  LightningProvider,
  LightningPeer,
  LightningWalletBalance,
} from "./types.js";

interface LndAddInvoiceResponse {
  r_hash: string;
  payment_request: string;
  add_index: string;
}

interface LndInvoiceResponse {
  r_hash: string;
  payment_request: string;
  description: string;
  value: string;
  settled: boolean;
  state: string;
  creation_date: string;
  expiry: string;
  amt_paid_sat: string;
}

interface LndWalletBalanceResponse {
  confirmed_balance: string;
  unconfirmed_balance: string;
  locked_balance: string;
}

interface LndPeerResponse {
  pub_key: string;
  address: string;
  alias: string;
  color: string;
  num_channels: number;
  sat_sent: string;
  sat_recv: string;
}

export class LndProvider implements LightningProvider {
  private readonly baseUrl: string;
  private readonly macaroon?: string;
  private readonly cert?: string;

  constructor(config: LightningConfig) {
    const protocol = config.cert ? "https" : "http";
    this.baseUrl = `${protocol}://${config.host}:${config.port}`;
    this.macaroon = config.macaroon;
    this.cert = config.cert;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (this.macaroon) {
      headers["Grpc-Metadata-macaroon"] = this.macaroon;
    }

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LND API error (${response.status}): ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async createInvoice(
    amount: number,
    description: string,
    expiry?: number,
  ): Promise<LightningInvoice> {
    const body: Record<string, unknown> = {
      value: amount,
      memo: description,
    };

    if (expiry) {
      body.expiry = expiry;
    }

    const data = await this.request<LndAddInvoiceResponse>(
      "POST",
      "/v1/invoices",
      body,
    );

    return {
      paymentHash: Buffer.from(data.r_hash, "base64").toString("hex"),
      paymentRequest: data.payment_request,
      description,
      amount,
      fee: 0,
      status: "pending",
      expiresAt: new Date(Date.now() + (expiry || 3600) * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  async lookupPayment(paymentHash: string): Promise<LightningPayment> {
    const hashBuffer = Buffer.from(paymentHash, "hex").toString("base64");

    const data = await this.request<LndInvoiceResponse>(
      "GET",
      `/v1/invoice/${hashBuffer}`,
    );

    let status: LightningPayment["status"];
    if (data.settled) {
      status = "succeeded";
    } else if (data.state === "CANCELED") {
      status = "failed";
    } else {
      status = "pending";
    }

    return {
      paymentHash: Buffer.from(data.r_hash, "base64").toString("hex"),
      paymentRequest: data.payment_request,
      amount: Number(data.value),
      fee: Number(data.amt_paid_sat) - Number(data.value),
      status,
      createdAt: data.creation_date,
      completedAt: data.settled ? new Date().toISOString() : undefined,
    };
  }

  async getWalletBalance(): Promise<LightningWalletBalance> {
    const data = await this.request<LndWalletBalanceResponse>(
      "GET",
      "/v1/balance/wallet",
    );

    return {
      balance: Number(data.confirmed_balance),
      pending: Number(data.unconfirmed_balance),
      reserved: Number(data.locked_balance),
      currency: "BTC",
    };
  }

  async connectPeer(uri: string): Promise<LightningPeer> {
    const [pubkey, hostPort] = uri.split("@");
    const [host, port] = hostPort.split(":");

    const data = await this.request<LndPeerResponse>("POST", "/v1/peers", {
      addr: {
        pubkey,
        host: `${host}:${port}`,
      },
    });

    return {
      publicKey: data.pub_key,
      address: data.address,
      alias: data.alias,
      color: data.color,
      channels: data.num_channels,
      capacity: Number(data.sat_sent) + Number(data.sat_recv),
    };
  }
}
