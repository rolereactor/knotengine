"use client";

import { useState } from "react";
import { ShieldCheck, ShieldOff, Globe, Plus, X, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getPlanLimits } from "@qodinger/knot-types";

interface IpAllowlistCardProps {
  plan: string;
  enabled: boolean;
  allowedIps: string[];
  saving: boolean;
  loading: boolean;
  onToggle: () => void;
  onAddIp: (ip: string) => void;
  onRemoveIp: (ip: string) => void;
}

export function IpAllowlistCard({
  plan,
  enabled,
  allowedIps,
  saving,
  loading,
  onToggle,
  onAddIp,
  onRemoveIp,
}: IpAllowlistCardProps) {
  const [newIp, setNewIp] = useState("");
  const [error, setError] = useState("");

  const planLimits = getPlanLimits(plan);
  const featureEnabled = planLimits.ipAllowlistEnabled;

  const validateIp = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("IP address is required");
      return false;
    }

    // IPv4
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?(\.\*)?$/;
    // IPv6 (simplified)
    const ipv6 = /^[0-9a-fA-F:]+(\/\d{1,3})?$/;

    if (!ipv4.test(trimmed) && !ipv6.test(trimmed)) {
      setError(
        "Invalid IP address format (use x.x.x.x, x.x.x.x/mask, or x.x.x.*)",
      );
      return false;
    }

    // Validate IPv4 octets if not a CIDR
    if (ipv4.test(trimmed) && !trimmed.includes("/")) {
      const parts = trimmed.split(".");
      for (const part of parts) {
        if (part !== "*") {
          const num = parseInt(part, 10);
          if (num > 255) {
            setError("IPv4 octets must be 0-255");
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleAdd = () => {
    setError("");
    const trimmed = newIp.trim();
    if (!validateIp(trimmed)) return;
    if (allowedIps.includes(trimmed)) {
      setError("IP address already in allowlist");
      return;
    }
    onAddIp(trimmed);
    setNewIp("");
    setError("");
  };

  if (!featureEnabled) {
    return (
      <Card className="bg-card/40 border-border/50 hover:bg-card/60 hover:border-primary/30 group shadow-sm backdrop-blur-md transition-all">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Globe className="text-primary size-5" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  IP Allowlist
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Restrict API access to trusted IP addresses.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-border/40 bg-muted/10 flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <ShieldOff className="text-muted-foreground size-4" />
              <span className="text-sm font-semibold">
                Available on Professional & Enterprise plans
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Upgrade to Professional or Enterprise to restrict API access to
              specific IP addresses for enhanced security.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 border-border/50 hover:bg-card/60 hover:border-primary/30 group shadow-sm backdrop-blur-md transition-all">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <Globe className="text-primary size-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                IP Allowlist
                <Badge
                  variant={enabled ? "default" : "secondary"}
                  className={
                    enabled
                      ? "border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-500"
                      : "bg-muted text-muted-foreground px-1.5 py-0.5"
                  }
                >
                  {enabled ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium">
                      <ShieldCheck className="size-2.5" /> Enabled
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium">
                      <ShieldOff className="size-2.5" /> Disabled
                    </span>
                  )}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Restrict API access to trusted IP addresses only.
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={saving || loading}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle description */}
        <div className="border-border/40 bg-muted/10 flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            {enabled ? (
              <ShieldCheck className="size-4 text-emerald-500" />
            ) : (
              <ShieldOff className="text-muted-foreground size-4" />
            )}
            <span className="text-sm font-semibold">
              {enabled
                ? "IP allowlist is active — only listed IPs can access the API"
                : "IP allowlist is disabled — all IPs can access the API"}
            </span>
          </div>
        </div>

        {/* Add new IP */}
        <div className="space-y-2">
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            Add IP Address
          </span>
          <div className="flex items-center gap-2">
            <Input
              placeholder="e.g. 192.168.1.1, 10.0.0.0/8, or 203.0.113.*"
              value={newIp}
              onChange={(e) => {
                setNewIp(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              disabled={saving}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              disabled={saving || !newIp.trim()}
              className="gap-1"
            >
              <Plus className="size-3" />
              Add
            </Button>
          </div>
          {error && (
            <p className="text-destructive text-[10px] font-medium">{error}</p>
          )}
          <p className="text-muted-foreground text-[10px]">
            Supports IPv4 (x.x.x.x), CIDR notation (x.x.x.x/mask), and wildcards
            (x.x.x.*).
          </p>
        </div>

        {/* Allowed IPs list */}
        <div className="space-y-2">
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            Allowed IPs ({allowedIps.length})
          </span>
          {allowedIps.length === 0 ? (
            <div className="border-border/40 bg-muted/10 rounded-lg border p-4 text-center">
              <p className="text-muted-foreground text-xs italic">
                No IP addresses configured. Add an IP address above to get
                started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {allowedIps.map((ip) => (
                <div
                  key={ip}
                  className="border-border/40 bg-muted/10 flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="text-muted-foreground size-3" />
                    <code className="font-mono text-sm">{ip}</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveIp(ip)}
                    disabled={saving}
                    className="text-destructive hover:text-destructive h-7 w-7 p-0"
                  >
                    {saving ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <X className="size-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
