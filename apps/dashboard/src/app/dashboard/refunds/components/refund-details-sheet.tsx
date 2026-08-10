"use client";

import { format } from "date-fns";
import { Copy, Check, Clock, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Refund } from "../types";
import { StatusBadge } from "./status-badge";
import { useState } from "react";

interface RefundDetailsSheetProps {
  selectedRefund: Refund | null;
  setSelectedRefund: (refund: Refund | null) => void;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  onCancelRefund: (refundId: string) => void;
}

export function RefundDetailsSheet({
  selectedRefund,
  setSelectedRefund,
  copiedId,
  copyToClipboard,
  onCancelRefund,
}: RefundDetailsSheetProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  return (
    <>
      <Sheet
        open={!!selectedRefund}
        onOpenChange={(open) => !open && setSelectedRefund(null)}
      >
        <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-md">
          <SheetHeader>
            <div className="mb-2 flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[10px] font-bold tracking-wider uppercase"
              >
                Refund Details
              </Badge>
            </div>
            <SheetTitle className="font-mono text-xl font-bold">
              {selectedRefund?.refund_id}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Created on{" "}
              {selectedRefund &&
                format(new Date(selectedRefund.created_at), "PPP 'at' HH:mm")}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="border-border/50 bg-muted/20 rounded-xl border p-4">
                <p className="text-muted-foreground mb-1 text-[10px] font-bold tracking-widest uppercase">
                  Status
                </p>
                <StatusBadge status={selectedRefund?.status || "pending"} />
              </div>
              <div className="border-border/50 bg-muted/20 rounded-xl border p-4">
                <p className="text-muted-foreground mb-1 text-[10px] font-bold tracking-widest uppercase">
                  Refund Amount
                </p>
                <p className="text-lg font-bold">
                  ${selectedRefund?.amount_usd.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Clock className="text-primary size-4" />
                Refund Info
              </h3>
              <div className="space-y-2">
                <div className="border-border/50 flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground">Invoice ID</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground/80 font-mono text-xs">
                      {selectedRefund?.invoice_id}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedRefund)
                          copyToClipboard(
                            selectedRefund.invoice_id,
                            "side-invoice",
                          );
                      }}
                    >
                      {copiedId === "side-invoice" ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="border-border/50 flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-bold">
                    {selectedRefund?.crypto_currency}
                  </span>
                </div>
                {selectedRefund?.crypto_amount && (
                  <div className="border-border/50 flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span className="text-muted-foreground">Crypto Amount</span>
                    <span className="font-mono">
                      {selectedRefund.crypto_amount}
                    </span>
                  </div>
                )}
                <div className="border-border/50 flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="text-foreground/80 max-w-[200px] text-right text-xs">
                    {selectedRefund?.reason}
                  </span>
                </div>
                {selectedRefund?.refund_address && (
                  <div className="border-border/50 flex flex-col gap-1.5 rounded-lg border p-3">
                    <span className="text-muted-foreground text-xs">
                      Refund Address
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/80 font-mono text-xs break-all">
                        {selectedRefund.refund_address}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedRefund?.refund_address)
                            copyToClipboard(
                              selectedRefund.refund_address,
                              "side-addr",
                            );
                        }}
                      >
                        {copiedId === "side-addr" ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                {selectedRefund?.tx_hash && (
                  <div className="border-border/50 flex flex-col gap-1.5 rounded-lg border p-3">
                    <span className="text-muted-foreground text-xs">
                      Transaction Hash
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/80 font-mono text-xs break-all">
                        {selectedRefund.tx_hash}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedRefund?.tx_hash)
                            copyToClipboard(selectedRefund.tx_hash, "side-tx");
                        }}
                      >
                        {copiedId === "side-tx" ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                {selectedRefund?.failure_reason && (
                  <div className="border-border/50 flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-sm">
                    <span className="text-xs font-bold text-rose-600 uppercase">
                      Failure Reason
                    </span>
                    <span className="max-w-[200px] text-right text-xs text-rose-600/80">
                      {selectedRefund.failure_reason}
                    </span>
                  </div>
                )}
                {selectedRefund?.processed_at && (
                  <div className="border-border/50 flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span className="text-muted-foreground">Processed At</span>
                    <span className="text-foreground/80 text-xs">
                      {format(
                        new Date(selectedRefund.processed_at),
                        "MMM d, yyyy HH:mm",
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedRefund?.status === "pending" && (
              <Button
                className="h-10 w-full gap-2 text-[11px] font-bold tracking-wider text-white uppercase"
                variant="destructive"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel Refund
              </Button>
            )}

            {selectedRefund?.tx_hash && (
              <Button
                asChild
                className="h-10 w-full gap-2 text-[11px] font-bold tracking-wider uppercase"
                variant="secondary"
              >
                <a
                  href={
                    selectedRefund.crypto_currency === "BTC"
                      ? `https://mempool.space/tx/${selectedRefund.tx_hash}`
                      : `https://etherscan.io/tx/${selectedRefund.tx_hash}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-3" />
                  View on Blockchain
                </a>
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Refund</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel refund{" "}
              <span className="text-foreground font-bold">
                {selectedRefund?.refund_id}
              </span>
              ?
              <br />
              <br />
              This action cannot be undone. The refund will be marked as failed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:justify-between">
            <Button variant="ghost" onClick={() => setShowCancelConfirm(false)}>
              Go Back
            </Button>
            <Button
              variant="destructive"
              className="gap-2 font-bold"
              onClick={() => {
                if (selectedRefund) onCancelRefund(selectedRefund.refund_id);
                setShowCancelConfirm(false);
              }}
            >
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
