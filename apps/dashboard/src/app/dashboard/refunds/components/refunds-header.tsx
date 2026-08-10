"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RefundsHeaderProps {
  onOpenCreate: () => void;
}

export function RefundsHeader({ onOpenCreate }: RefundsHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Refunds</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage refunds for your invoices. Issue partial or full refunds to
          customers.
        </p>
      </div>
      <Button className="gap-2 font-bold" onClick={onOpenCreate}>
        <RotateCcw className="size-4" />
        Create Refund
      </Button>
    </div>
  );
}
