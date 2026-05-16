# 🧩 @qodinger/knot-types

Shared TypeScript definitions and constants for the [KnotEngine](https://github.com/qodinger/knotengine) ecosystem.

This package ensures strict type safety between the API, Dashboard, Checkout, and the official SDK, centralizing all blockchain and payment-related models.

## 🚀 Installation

```bash
npm install @qodinger/knot-types
```

## 🛠️ Highlights

- **Currency Support**: Strong typed enums for `BTC`, `LTC`, `ETH`, `USDT_ERC20`, and `POLYGON`.
- **Status Machine Logic**: Centralized definition of all payment states (`pending`, `mempool_detected`, `confirmed`, `expired`, etc.).
- **Invoice & Merchant interfaces**: Standardized data structures for cross-package consistency.
- **Confirmation Policies**: Default block-depth requirements per asset.

## 📖 Usage

```typescript
import { Invoice, SUPPORTED_CURRENCIES } from "@qodinger/knot-types";

const payment: Partial<Invoice> = {
  status: "pending",
  cryptoCurrency: "BTC",
  amountUsd: 100,
};
```

## 📄 License

AGPL-3.0
