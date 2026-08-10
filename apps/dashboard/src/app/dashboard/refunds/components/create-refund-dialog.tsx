"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";

interface CreateRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    invoice_id: string;
    amount_usd: number;
    reason: string;
    refund_address?: string;
  }) => Promise<void>;
}

export function CreateRefundDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateRefundDialogProps) {
  const [invoiceId, setInvoiceId] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [reason, setReason] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !amountUsd || !reason) return;

    setLoading(true);
    try {
      await onSubmit({
        invoice_id: invoiceId,
        amount_usd: parseFloat(amountUsd),
        reason,
        ...(refundAddress ? { refund_address: refundAddress } : {}),
      });
      setInvoiceId("");
      setAmountUsd("");
      setReason("");
      setRefundAddress("");
      onOpenChange(false);
    } catch {
      // Error handled by the hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-4" />
            Create Refund
          </DialogTitle>
          <DialogDescription>
            Issue a refund for a confirmed invoice. The refund will be queued
            for payout to the destination address.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_id">Invoice ID</Label>
            <Input
              id="invoice_id"
              placeholder="inv_..."
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount_usd">Refund Amount (USD)</Label>
            <Input
              id="amount_usd"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="Customer requested refund..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund_address">Refund Address (optional)</Label>
            <Input
              id="refund_address"
              placeholder="bc1q... or 0x..."
              value={refundAddress}
              onChange={(e) => setRefundAddress(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-6 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2 font-bold"
              disabled={loading || !invoiceId || !amountUsd || !reason}
            >
              {loading ? "Creating..." : "Create Refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
