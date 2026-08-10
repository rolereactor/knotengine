import { Invoice, Merchant, User } from "@qodinger/knot-database";

/**
 * 📊 Scheduled Export Processor
 *
 * Queries merchants with scheduled exports enabled, generates CSV/JSON,
 * and sends the export via email with the file attached.
 */
export async function processScheduledExport(
  merchantId: string,
  frequency: "daily" | "weekly",
): Promise<void> {
  const merchant = await Merchant.findOne({ merchantId });
  if (!merchant || !merchant.scheduledExport?.enabled) {
    console.log(`Skipping scheduled export for ${merchantId}: not enabled`);
    return;
  }

  const user = merchant.userId ? await User.findById(merchant.userId) : null;
  const recipientEmail = user?.email || merchant.email;
  if (!recipientEmail) {
    console.warn(
      `⚠️ No email found for merchant ${merchantId}, skipping scheduled export`,
    );
    return;
  }

  const now = new Date();
  const from = new Date(now);
  if (frequency === "daily") {
    from.setDate(from.getDate() - 1);
  } else {
    from.setDate(from.getDate() - 7);
  }

  const filter: Record<string, unknown> = {
    merchantId: merchant._id,
    createdAt: { $gte: from, $lte: now },
    "metadata.isTestnet": { $ne: true },
  };

  const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

  const totalUsd = invoices.reduce((sum, inv) => sum + inv.amountUsd, 0);

  const format = merchant.scheduledExport.format || "csv";
  const dateRange = {
    from: from.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
  };

  const rows = invoices.map((inv) => ({
    invoice_id: inv.invoiceId,
    amount_usd: inv.amountUsd,
    crypto_amount: inv.cryptoAmount,
    crypto_amount_received: inv.cryptoAmountReceived || 0,
    crypto_currency: inv.cryptoCurrency,
    pay_address: inv.payAddress,
    status: inv.status,
    confirmations: inv.confirmations,
    required_confirmations: inv.requiredConfirmations,
    tx_hash: inv.txHash || "",
    fee_usd: inv.feeUsd,
    fee_crypto: inv.feeCrypto,
    expires_at: inv.expiresAt.toISOString(),
    paid_at: inv.paidAt?.toISOString() || "",
    created_at: inv.createdAt.toISOString(),
    description: inv.description || "",
    metadata_email: (inv.metadata?.email as string) || "",
  }));

  let fileContent: string;
  let contentType: string;
  let fileExtension: string;

  if (format === "csv") {
    const headers = Object.keys(rows[0] || {});
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = String(row[h as keyof typeof row] ?? "");
            return val.includes(",") || val.includes('"') || val.includes("\n")
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          })
          .join(","),
      ),
    ];
    fileContent = csvLines.join("\n");
    contentType = "text/csv";
    fileExtension = "csv";
  } else {
    fileContent = JSON.stringify(
      { dateRange, invoiceCount: rows.length, totalUsd, invoices: rows },
      null,
      2,
    );
    contentType = "application/json";
    fileExtension = "json";
  }

  const filename = `invoices-${dateRange.from}-to-${dateRange.to}.${fileExtension}`;

  const { EmailService } = await import("../infra/email-service.js");
  await EmailService.sendScheduledExport({
    to: recipientEmail,
    merchantName: merchant.name || "Merchant",
    frequency,
    dateRange,
    invoiceCount: invoices.length,
    totalUsd,
    format,
    attachment: {
      filename,
      content: fileContent,
      contentType,
    },
  });

  await Merchant.findByIdAndUpdate(merchant._id, {
    $set: { "scheduledExport.lastExportedAt": now },
  });

  console.info(
    `📊 Scheduled export sent: ${frequency} export for ${merchant.name} (${invoices.length} invoices, $${totalUsd.toFixed(2)})`,
  );
}

/**
 * 📊 Process All Scheduled Exports
 *
 * Iterates over merchants with scheduled exports enabled and queues
 * individual export jobs. Called by the daily BullMQ recurring job.
 */
export async function processAllScheduledExports(): Promise<{
  processed: number;
  skipped: number;
}> {
  const now = new Date();
  let processed = 0;
  let skipped = 0;

  const merchants = await Merchant.find({
    "scheduledExport.enabled": true,
    isActive: true,
    isDeleted: false,
  });

  for (const merchant of merchants) {
    const frequency = merchant.scheduledExport.frequency || "daily";

    // Throttle: skip if last export was recent enough for this frequency
    if (merchant.scheduledExport.lastExportedAt) {
      const lastExported = merchant.scheduledExport.lastExportedAt.getTime();
      const elapsed = now.getTime() - lastExported;
      const minInterval =
        frequency === "daily"
          ? 20 * 60 * 60 * 1000 // 20h minimum between daily exports
          : 6 * 24 * 60 * 60 * 1000; // 6 days minimum between weekly exports

      if (elapsed < minInterval) {
        skipped++;
        continue;
      }
    }

    try {
      await processScheduledExport(merchant.merchantId, frequency);
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `❌ Scheduled export failed for merchant ${merchant.merchantId}: ${message}`,
      );
    }
  }

  console.info(
    `📊 Scheduled exports batch complete: ${processed} processed, ${skipped} skipped`,
  );
  return { processed, skipped };
}
