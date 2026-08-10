"use client";

import { format } from "date-fns";
import {
  Search,
  MoreHorizontal,
  Copy,
  Check,
  Calendar,
  RotateCcw,
  Info,
  XCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Refund } from "../types";
import { StatusBadge } from "./status-badge";

interface RefundsTableProps {
  refunds: Refund[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  onSelectRefund: (refund: Refund) => void;
  onCancelRefund: (refundId: string) => void;
}

export function RefundsTable({
  refunds,
  loading,
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  copiedId,
  copyToClipboard,
  onSelectRefund,
  onCancelRefund: _onCancelRefund,
}: RefundsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full lg:w-auto"
        >
          <TabsList className="bg-muted/30 h-9">
            <TabsTrigger value="all" className="px-3 text-xs font-medium">
              All
            </TabsTrigger>
            <TabsTrigger value="pending" className="px-3 text-xs font-medium">
              Pending
            </TabsTrigger>
            <TabsTrigger
              value="processing"
              className="px-3 text-xs font-medium"
            >
              Processing
            </TabsTrigger>
            <TabsTrigger value="completed" className="px-3 text-xs font-medium">
              Completed
            </TabsTrigger>
            <TabsTrigger value="failed" className="px-3 text-xs font-medium">
              Failed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full lg:w-72">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
            size={14}
          />
          <Input
            placeholder="Search refunds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-muted/30 h-9 border-none pl-9 text-sm"
          />
        </div>
      </div>

      <Card className="gap-0 overflow-hidden border py-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 h-12 hover:bg-transparent">
                <TableHead className="w-[200px] pl-6 text-[10px] font-bold tracking-wider uppercase">
                  Refund ID
                </TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                  Amount
                </TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                  Invoice
                </TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                  Reason
                </TableHead>
                <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                  Date
                </TableHead>
                <TableHead className="pr-6 text-right text-[10px] font-bold tracking-wider uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border/20 border-b">
                    <TableCell className="pl-6">
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-5 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : refunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-muted/30 flex size-12 items-center justify-center rounded-full">
                        <RotateCcw className="text-muted-foreground/20 size-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-foreground text-sm font-semibold">
                          No refunds found
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {searchTerm
                            ? "Try adjusting your search query."
                            : "Refunds will appear here when you issue refunds."}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                refunds.map((refund) => (
                  <TableRow
                    key={refund.refund_id}
                    className="border-border/20 hover:bg-muted/5 group cursor-pointer border-b transition-colors"
                    onClick={() => onSelectRefund(refund)}
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-mono text-xs">
                          {refund.refund_id}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(refund.refund_id, refund.refund_id);
                          }}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          {copiedId === refund.refund_id ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="text-muted-foreground hover:text-foreground size-3" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={refund.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold">
                        ${refund.amount_usd.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground font-mono text-xs">
                        {refund.invoice_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground max-w-[150px] truncate text-xs">
                        {refund.reason}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3" />
                        {format(new Date(refund.created_at), "MMM d, HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-muted-foreground text-xs">
                            Actions
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRefund(refund);
                            }}
                          >
                            <Info className="mr-2 h-3.5 w-3.5" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(
                                refund.refund_id,
                                refund.refund_id,
                              );
                            }}
                          >
                            <Copy className="mr-2 h-3.5 w-3.5" />
                            Copy refund ID
                          </DropdownMenuItem>
                          {refund.status === "pending" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-xs text-rose-500 hover:bg-rose-500/5 hover:text-rose-600 focus:bg-rose-500/5 focus:text-rose-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmCancelId(refund.refund_id);
                                }}
                              >
                                <XCircle className="mr-2 h-3.5 w-3.5" />
                                Cancel refund
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {refunds.length > 0 && (
          <CardFooter className="bg-muted/5 flex items-center justify-between border-t px-6 py-4!">
            <p className="text-muted-foreground text-xs">
              Showing {refunds.length} refund{refunds.length !== 1 ? "s" : ""}
            </p>
          </CardFooter>
        )}
      </Card>

      <div className="text-muted-foreground text-xs">
        <p>
          Only confirmed invoices are eligible for refunds. Pending refunds can
          be cancelled before processing.
        </p>
      </div>

      <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-3 text-xs">
        <RotateCcw className="text-muted-foreground size-4" />
        <span className="text-muted-foreground">
          Refunds are processed manually. Once a refund is created, it will be
          queued for payout to the destination address.
        </span>
      </div>

      <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-3 text-xs">
        <span className="text-muted-foreground">
          Refund webhook events:{" "}
          <code className="text-foreground font-mono font-bold">
            refund.created
          </code>{" "}
          <code className="text-foreground font-mono font-bold">
            refund.completed
          </code>{" "}
          <code className="text-foreground font-mono font-bold">
            refund.failed
          </code>
        </span>
      </div>
    </div>
  );
}
