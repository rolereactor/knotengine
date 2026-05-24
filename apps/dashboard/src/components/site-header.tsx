"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Search,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signOut } from "next-auth/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  type: "success" | "warning" | "error" | "info";
  link?: string;
};

export function SiteHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch initial notifications
  useEffect(() => {
    if (!user?.merchantId) return;

    const fetchNotifications = async () => {
      try {
        const res = await api.get("/v1/merchants/me/notifications");
        setNotifications(
          res.data.data.map((n: Notification & { _id: string }) => ({
            id: n._id,
            title: n.title,
            description: n.description,
            createdAt: n.createdAt,
            isRead: n.isRead,
            type: n.type,
            link: n.link,
          })),
        );
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifications();
  }, [user?.merchantId]);

  // Socket connection for real-time notifications
  useEffect(() => {
    if (!user?.merchantId) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5050";
    const socket: Socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("🔌 Connected to notification socket");
      socket.emit("join_merchant", user.merchantId);
    });

    socket.on(
      "notification",
      (newNotification: Notification & { id: string }) => {
        console.log("🔔 New notification received:", newNotification);
        setNotifications((prev) => [
          {
            id: newNotification.id,
            title: newNotification.title,
            description: newNotification.description,
            createdAt: newNotification.createdAt,
            isRead: newNotification.isRead,
            type: newNotification.type,
            link: newNotification.link,
          },
          ...prev,
        ]);
      },
    );

    socket.on(
      "notification_updated",
      (updatedNotification: Notification & { id: string }) => {
        console.log("🔄 Notification updated:", updatedNotification);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === updatedNotification.id
              ? {
                  ...n,
                  title: updatedNotification.title,
                  description: updatedNotification.description,
                  type: updatedNotification.type,
                  isRead: updatedNotification.isRead,
                }
              : n,
          ),
        );
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [user?.merchantId]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const markAllAsRead = async () => {
    try {
      await api.patch("/v1/merchants/me/notifications/mark-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/v1/merchants/me/notifications/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  return (
    <header className="border-border/50 bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 flex h-(--header-height) w-full items-center border-b backdrop-blur">
      <div className="flex h-full w-full items-center gap-2 px-8">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="hover:bg-muted/60 h-9 w-9" />
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="relative hidden w-64 lg:flex">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              type="search"
              placeholder="Quick search..."
              className="bg-muted/40 focus:bg-background hover:bg-muted/60 h-9 border-none pl-8 transition-all"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-muted/60 relative h-9 w-9 focus-visible:ring-0"
              >
                <Bell className="size-4.5" />
                {unreadCount > 0 && (
                  <span className="bg-primary border-background absolute top-2.5 right-2.5 size-2 rounded-full border-2" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-background/80 border-border/40 w-96 overflow-hidden rounded-2xl border p-0 shadow-2xl backdrop-blur-xl"
            >
              <div className="bg-muted/20 flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <DropdownMenuLabel className="text-foreground/90 p-0 text-sm font-bold tracking-tight">
                    Notifications
                  </DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary h-4 border-none px-1.5 text-[9px] font-bold"
                    >
                      {unreadCount} NEW
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      markAllAsRead();
                    }}
                    className="text-muted-foreground hover:text-primary text-[9px] font-bold tracking-[0.15em] uppercase transition-colors"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator className="m-0" />
              <ScrollArea className="h-96">
                <div className="border-border/20 flex flex-col border-t">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3 p-12 text-center">
                      <div className="bg-muted/30 flex size-14 items-center justify-center rounded-2xl">
                        <Bell className="text-muted-foreground/30 size-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold tracking-tight">
                          Clear for now
                        </p>
                        <p className="text-muted-foreground/60 max-w-45 text-xs leading-relaxed">
                          We&apos;ll ping you here when your merchant has news.
                        </p>
                      </div>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className={cn(
                          "focus:bg-muted/30 border-border/10 group flex cursor-pointer items-start gap-4 border-b p-5 transition-all last:border-0",
                          !n.isRead &&
                            "bg-primary/5 border-l-primary focus:bg-primary/10 border-l-2",
                        )}
                        onClick={() => {
                          if (!n.isRead) markAsRead(n.id);
                          if (n.link) router.push(n.link);
                        }}
                      >
                        <NotificationIcon type={n.type} />

                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className={cn(
                                "text-[12px] leading-none font-bold tracking-tight transition-colors",
                                !n.isRead
                                  ? "text-foreground"
                                  : "text-muted-foreground",
                                "group-hover:text-foreground",
                              )}
                            >
                              {n.title}
                            </p>
                            <span className="text-muted-foreground/50 text-[10px] font-bold tracking-widest whitespace-nowrap uppercase">
                              {formatDistanceToNow(new Date(n.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-muted-foreground/70 group-hover:text-muted-foreground line-clamp-2 pr-2 text-[11px] leading-normal font-medium transition-colors">
                            {n.description}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="bg-muted/10 border-border/20 border-t p-3 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  className="group text-muted-foreground hover:bg-primary/5 hover:text-primary border-border/20 h-10 w-full rounded-xl border text-[10px] font-bold tracking-[0.2em] uppercase transition-all"
                  asChild
                >
                  <Link href="/dashboard/activity" prefetch={false}>
                    Full Activity Log
                    <ExternalLink className="ml-2 size-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="border-border/50 h-9 w-9 border">
                  <AvatarImage
                    src={user?.image || ""}
                    alt={user?.name || "User"}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mt-2 w-56" align="end" forceMount>
              <DropdownMenuLabel className="p-4 font-normal">
                <div className="flex flex-col space-y-1 overflow-hidden">
                  <p className="truncate text-sm leading-none font-bold">
                    {user?.name || "Merchant Owner"}
                  </p>
                  <p className="text-muted-foreground truncate text-xs leading-none">
                    {user?.email || "No email provided"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer p-3">
                <Link
                  href="/dashboard/settings"
                  className="flex w-full items-center"
                  prefetch={false}
                >
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer p-3">
                <Link
                  href="/dashboard/balances"
                  className="flex w-full items-center"
                  prefetch={false}
                >
                  Balances
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer p-3 font-bold"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function NotificationIcon({ type }: { type: Notification["type"] }) {
  const configs = {
    success: {
      icon: CheckCircle2,
      class: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    warning: {
      icon: Clock,
      class: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    error: {
      icon: XCircle,
      class: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    },
    info: {
      icon: Info,
      class: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-110",
        config.class,
      )}
    >
      <Icon className="size-4" />
    </div>
  );
}
