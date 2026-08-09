"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Plus,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  BarChart3,
  Check,
  ArrowRight,
  ArrowLeft,
  Hash,
  DollarSign,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface PaymentLink {
  id: string;
  slug: string;
  url: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  is_active: boolean;
  usage_count: number;
  total_amount_usd: number;
  max_uses?: number;
  expires_at?: string;
  created_at: string;
}

interface CreateFormData {
  title: string;
  description: string;
  amount: string;
  currency: string;
  slug: string;
  useCustomSlug: boolean;
  maxUses: string;
  useMaxUses: boolean;
  expiresAt: string;
  useExpires: boolean;
  redirectUrl: string;
  useRedirect: boolean;
}

const currencies = [
  { id: "BTC", label: "Bitcoin" },
  { id: "LTC", label: "Litecoin" },
  { id: "ETH", label: "Ethereum" },
  { id: "USDT_ERC20", label: "USDT (ERC20)" },
  { id: "USDC_ERC20", label: "USDC (ERC20)" },
];

export default function PaymentLinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateFormData>({
    title: "",
    description: "",
    amount: "",
    currency: "BTC",
    slug: "",
    useCustomSlug: false,
    maxUses: "",
    useMaxUses: false,
    expiresAt: "",
    useExpires: false,
    redirectUrl: "",
    useRedirect: false,
  });

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/payment-links");
      if (res.ok) {
        const data = await res.json();
        setLinks(data.data || []);
      }
    } catch {
      console.error("Failed to fetch payment links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const deactivateLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/payment-links/${linkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Payment link deactivated");
        fetchLinks();
      }
    } catch {
      toast.error("Failed to deactivate link");
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
      };

      if (formData.amount) {
        body.amount = parseFloat(formData.amount);
      }

      if (formData.useCustomSlug && formData.slug) {
        body.slug = formData.slug;
      }

      if (formData.amount) {
        body.currency = formData.currency;
      }

      if (formData.useMaxUses && formData.maxUses) {
        body.max_uses = parseInt(formData.maxUses);
      }

      if (formData.useExpires && formData.expiresAt) {
        body.expires_at = new Date(formData.expiresAt).toISOString();
      }

      if (formData.useRedirect && formData.redirectUrl) {
        body.redirect_url = formData.redirectUrl;
      }

      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to create link");
      }

      await res.json();
      toast.success("Payment link created");
      setShowCreateModal(false);
      setCreateStep(0);
      setFormData({
        title: "",
        description: "",
        amount: "",
        currency: "BTC",
        slug: "",
        useCustomSlug: false,
        maxUses: "",
        useMaxUses: false,
        expiresAt: "",
        useExpires: false,
        redirectUrl: "",
        useRedirect: false,
      });
      fetchLinks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setFormData({ ...formData, slug, useCustomSlug: true });
  };

  const stats = {
    totalLinks: links.length,
    activeLinks: links.filter((l) => l.is_active).length,
    totalUsage: links.reduce((sum, l) => sum + l.usage_count, 0),
    totalVolume: links.reduce((sum, l) => sum + l.total_amount_usd, 0),
  };

  const topLink = links.reduce(
    (best, l) => (l.usage_count > (best?.usage_count || 0) ? l : best),
    null as PaymentLink | null,
  );

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getExpiryStatus = (link: PaymentLink) => {
    if (!link.expires_at) return null;
    const exp = new Date(link.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
    if (daysLeft < 0)
      return { label: "Expired", variant: "destructive" as const };
    if (daysLeft <= 7)
      return { label: `${daysLeft}d left`, variant: "secondary" as const };
    return null;
  };

  const stepTitles = ["Details", "Amount", "Options"];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Links</h1>
          <p className="text-muted-foreground">
            Create reusable payment links to share anywhere
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Link
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Links
            </CardTitle>
            <Link2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.totalLinks}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.activeLinks} active
            </p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500/20 to-emerald-500/5" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Uses
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.totalUsage}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {topLink ? `Top: ${topLink.title}` : "No uses yet"}
            </p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500/20 to-blue-500/5" />
        </Card>

        <Card className="relative col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Volume
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-500">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCurrency(stats.totalVolume)
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.totalLinks > 0
                ? `${formatCurrency(stats.totalVolume / stats.totalLinks)} avg per link`
                : "No revenue yet"}
            </p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-500/50" />
        </Card>
      </div>

      {/* Links List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Payment Links</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-4">
                <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-2xl">
                  <Link2 className="text-muted-foreground h-8 w-8" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-emerald-500" />
              </div>
              <h3 className="mb-1 text-lg font-semibold">
                No payment links yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                Create your first payment link to start accepting crypto
                payments anywhere. Share via email, social, or embed in your
                site.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Link
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => {
                const expiryStatus = getExpiryStatus(link);
                return (
                  <div
                    key={link.id}
                    className="group border-border/50 hover:border-border hover:bg-accent/30 flex items-center gap-4 rounded-xl border p-4 transition-all duration-200"
                  >
                    {/* Icon */}
                    <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                      <Link2 className="text-primary h-5 w-5" />
                    </div>

                    {/* Title + Slug */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{link.title}</div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span>/pay/{link.slug}</span>
                        {link.description && (
                          <>
                            <span className="text-border">·</span>
                            <span className="max-w-[200px] truncate">
                              {link.description}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="shrink-0 text-right">
                      <div className="font-medium">
                        {link.amount ? formatCurrency(link.amount) : "Custom"}
                      </div>
                      {link.currency && (
                        <div className="text-muted-foreground text-xs">
                          {link.currency}
                        </div>
                      )}
                    </div>

                    {/* Usage */}
                    <div className="w-20 shrink-0 text-right">
                      <div className="font-medium">{link.usage_count}</div>
                      <div className="text-muted-foreground text-xs">uses</div>
                    </div>

                    {/* Volume */}
                    <div className="w-24 shrink-0 text-right">
                      <div className="font-medium text-emerald-500">
                        {formatCurrency(link.total_amount_usd)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        volume
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={link.is_active ? "default" : "secondary"}>
                        {link.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {expiryStatus && (
                        <Badge variant={expiryStatus.variant}>
                          {expiryStatus.label}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(link.url, link.id)}
                      >
                        {copiedId === link.id ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => copyToClipboard(link.url)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(link.url, "_blank")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/dashboard/links/${link.id}`)
                            }
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            View Stats
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deactivateLink(link.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Link Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setCreateStep(0);
          }
        }}
      >
        <DialogContent width="sm">
          <DialogHeader>
            <DialogTitle>Create Payment Link</DialogTitle>
            <DialogDescription>
              Step {createStep + 1} of 3 — {stepTitles[createStep]}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 px-1">
            {stepTitles.map((title, i) => (
              <div key={title} className="flex flex-1 items-center gap-2">
                <div
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i <= createStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Step 0: Details */}
          {createStep === 0 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Donation, Product Name, Tip Jar"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  This appears on the payment page
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description of what this link is for"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slug">Custom URL</Label>
                  <Switch
                    id="slug"
                    checked={formData.useCustomSlug}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, useCustomSlug: checked })
                    }
                  />
                </div>
                {formData.useCustomSlug ? (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">/pay/</span>
                    <Input
                      placeholder="my-link"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        })
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateSlug}
                      disabled={!formData.title}
                    >
                      Generate
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Auto-generated if not specified
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Amount */}
          {createStep === 1 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Amount Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, amount: "", currency: "BTC" })
                    }
                    className={`rounded-xl border-2 p-4 text-center transition-all ${
                      !formData.amount
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <DollarSign className="text-muted-foreground mx-auto mb-1 h-5 w-5" />
                    <div className="text-sm font-medium">Custom Amount</div>
                    <div className="text-muted-foreground text-xs">
                      User enters amount
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        amount: formData.amount || "10",
                      })
                    }
                    className={`rounded-xl border-2 p-4 text-center transition-all ${
                      formData.amount
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <Hash className="text-muted-foreground mx-auto mb-1 h-5 w-5" />
                    <div className="text-sm font-medium">Fixed Amount</div>
                    <div className="text-muted-foreground text-xs">
                      Predefined amount
                    </div>
                  </button>
                </div>
              </div>

              {formData.amount && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <div className="relative">
                      <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        id="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="10.00"
                        className="pl-8 text-lg font-medium"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(val) =>
                        setFormData({ ...formData, currency: val })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {!formData.amount && (
                <div className="bg-muted/50 rounded-xl p-4">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4" />
                    <span>
                      Customers will see a payment page where they can enter any
                      amount
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Options */}
          {createStep === 2 && (
            <div className="space-y-4 py-2">
              {/* Max Uses */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Usage Limit</Label>
                    <p className="text-muted-foreground text-xs">
                      Limit how many times this link can be used
                    </p>
                  </div>
                  <Switch
                    checked={formData.useMaxUses}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, useMaxUses: checked })
                    }
                  />
                </div>
                {formData.useMaxUses && (
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g., 100"
                    value={formData.maxUses}
                    onChange={(e) =>
                      setFormData({ ...formData, maxUses: e.target.value })
                    }
                  />
                )}
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Expiration Date</Label>
                    <p className="text-muted-foreground text-xs">
                      Auto-deactivate after this date
                    </p>
                  </div>
                  <Switch
                    checked={formData.useExpires}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, useExpires: checked })
                    }
                  />
                </div>
                {formData.useExpires && (
                  <Input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) =>
                      setFormData({ ...formData, expiresAt: e.target.value })
                    }
                  />
                )}
              </div>

              {/* Redirect URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Redirect After Payment</Label>
                    <p className="text-muted-foreground text-xs">
                      Send customers to a URL after payment
                    </p>
                  </div>
                  <Switch
                    checked={formData.useRedirect}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, useRedirect: checked })
                    }
                  />
                </div>
                {formData.useRedirect && (
                  <Input
                    type="url"
                    placeholder="https://example.com/thank-you"
                    value={formData.redirectUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, redirectUrl: e.target.value })
                    }
                  />
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {createStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCreateStep(createStep - 1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            {createStep < 2 ? (
              <Button
                onClick={() => setCreateStep(createStep + 1)}
                disabled={createStep === 0 && !formData.title.trim()}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <>
                    <div className="border-primary-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Link
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
