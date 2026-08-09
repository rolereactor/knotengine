"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  CheckCheck,
  Clock,
  DollarSign,
  User,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Message {
  id: string;
  donor_name: string;
  amount_usd: number;
  message: string;
  created_at: string;
  read: boolean;
}

interface DonationInfo {
  id: string;
  title: string;
  donor_count: number;
  current_amount: number;
}

export default function DonationMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [donation, setDonation] = useState<DonationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = async (pageNum: number, append = false) => {
    try {
      const { id } = await params;
      const res = await fetch(
        `/api/donations/${id}/messages?page=${pageNum}&limit=20`,
      );

      if (res.ok) {
        const data = await res.json();
        const newMessages = data.messages || [];

        if (append) {
          setMessages((prev) => [...prev, ...newMessages]);
        } else {
          setMessages(newMessages);
        }

        setHasMore(newMessages.length === 20);

        // Count unread
        const unread = newMessages.filter((m: Message) => !m.read).length;
        setUnreadCount(unread);
      }
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const fetchDonationInfo = async () => {
    try {
      const { id } = await params;
      const res = await fetch(`/api/donations/${id}/stats`);

      if (res.ok) {
        const data = await res.json();
        setDonation({
          id: data.donation.id,
          title: data.donation.title,
          donor_count: data.donation.donor_count,
          current_amount: data.donation.current_amount,
        });
      }
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setMessages([]);
    fetchData(1, false);
    fetchDonationInfo();
  }, [params]);

  const markAsRead = async (messageId: string) => {
    try {
      const { id } = await params;
      const res = await fetch(`/api/donations/${id}/alerts/${messageId}/read`, {
        method: "POST",
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, read: true } : m)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, true);
  };

  const refresh = () => {
    setLoading(true);
    setPage(1);
    setMessages([]);
    fetchData(1, false);
    fetchDonationInfo();
  };

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/donations")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Donation Messages
            </h1>
            {donation && (
              <p className="text-muted-foreground">{donation.title}</p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {donation && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Messages
              </CardTitle>
              <MessageCircle className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Unread
              </CardTitle>
              <Clock className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {loading ? <Skeleton className="h-6 w-8" /> : unreadCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Raised
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {formatCurrency(donation.current_amount)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="mb-1 text-lg font-semibold">No messages yet</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Messages from donors will appear here when they leave a note
                with their donation.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${
                    msg.read
                      ? "border-border/50 bg-background"
                      : "border-orange-500/30 bg-orange-500/5"
                  }`}
                >
                  {/* Avatar */}
                  <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <User className="text-muted-foreground h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {msg.donor_name || "Anonymous"}
                      </span>
                      <span className="text-xs font-medium text-emerald-500">
                        {formatCurrency(msg.amount_usd)}
                      </span>
                      {!msg.read && (
                        <Badge
                          variant="secondary"
                          className="px-1 py-0 text-[10px]"
                        >
                          New
                        </Badge>
                      )}
                    </div>
                    {msg.message && (
                      <p className="text-muted-foreground text-sm italic">
                        &ldquo;{msg.message}&rdquo;
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Mark as Read */}
                  {!msg.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => markAsRead(msg.id)}
                      title="Mark as read"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={loadMore}>
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
