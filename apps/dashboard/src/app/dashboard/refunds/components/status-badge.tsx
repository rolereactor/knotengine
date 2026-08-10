"use client";

import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RefundStatus } from "../types";

interface StatusBadgeProps {
  status: RefundStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const configs: Record<
    string,
    {
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      className: string;
    }
  > = {
    pending: {
      label: "Pending",
      icon: Clock,
      className:
        "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10",
    },
    processing: {
      label: "Processing",
      icon: Clock,
      className:
        "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10",
    },
    completed: {
      label: "Completed",
      icon: CheckCircle2,
      className:
        "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    },
    failed: {
      label: "Failed",
      icon: XCircle,
      className:
        "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10",
    },
  };

  const config = configs[status] || {
    label: status,
    icon: AlertCircle,
    className: "text-gray-500 bg-gray-100 dark:bg-gray-500/10",
  };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        config.className,
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}
