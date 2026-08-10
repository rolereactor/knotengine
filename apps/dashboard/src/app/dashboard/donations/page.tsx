"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Heart,
  Plus,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  BarChart3,
  Check,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Sparkles,
  Users,
  Radio,
  MessageCircle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Donation {
  id: string;
  slug: string;
  url: string;
  title: string;
  description?: string;
  goal_amount?: number;
  current_amount: number;
  donor_count: number;
  suggested_amounts: number[];
  allow_custom_amount: boolean;
  show_progress: boolean;
  is_active: boolean;
  max_donations?: number;
  expires_at?: string;
  created_at: string;
}

interface CreateFormData {
  title: string;
  description: string;
  goalAmount: string;
  useGoal: boolean;
  suggestedAmounts: string;
  allowCustomAmount: boolean;
  showProgress: boolean;
  thankYouMessage: string;
  useThankYou: boolean;
  slug: string;
  useCustomSlug: boolean;
  maxDonations: string;
  useMaxDonations: boolean;
  expiresAt: string;
  useExpires: boolean;
  redirectUrl: string;
  useRedirect: boolean;
  allowMessages: boolean;
  maxMessageLength: string;
  showMessages: boolean;
  alertsEnabled: boolean;
  alertColor: string;
  alertDuration: string;
  alertMinimumAmount: string;
  leaderboardEnabled: boolean;
  leaderboardSize: string;
}

export default function DonationsPage() {
  const router = useRouter();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateFormData>({
    title: "",
    description: "",
    goalAmount: "",
    useGoal: false,
    suggestedAmounts: "5, 10, 25, 50, 100",
    allowCustomAmount: true,
    showProgress: true,
    thankYouMessage: "",
    useThankYou: false,
    slug: "",
    useCustomSlug: false,
    maxDonations: "",
    useMaxDonations: false,
    expiresAt: "",
    useExpires: false,
    redirectUrl: "",
    useRedirect: false,
    allowMessages: true,
    maxMessageLength: "200",
    showMessages: true,
    alertsEnabled: true,
    alertColor: "#FF006E",
    alertDuration: "5000",
    alertMinimumAmount: "0",
    leaderboardEnabled: true,
    leaderboardSize: "10",
  });

  const fetchDonations = async () => {
    try {
      const { data } = await api.get("/donations");
      setDonations(data.data || []);
    } catch {
      console.error("Failed to fetch donations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const deactivateDonation = async (id: string) => {
    try {
      await api.delete(`/donations/${id}`);
      toast.success("Donation page deactivated");
      fetchDonations();
    } catch {
      toast.error("Failed to deactivate donation page");
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
        allow_custom_amount: formData.allowCustomAmount,
        show_progress: formData.showProgress,
      };

      if (formData.useGoal && formData.goalAmount) {
        body.goal_amount = parseFloat(formData.goalAmount);
      }

      if (formData.suggestedAmounts) {
        body.suggested_amounts = formData.suggestedAmounts
          .split(",")
          .map((s) => parseFloat(s.trim()))
          .filter((n) => !isNaN(n) && n > 0);
      }

      if (formData.useThankYou && formData.thankYouMessage) {
        body.thank_you_message = formData.thankYouMessage.trim();
      }

      if (formData.useCustomSlug && formData.slug) {
        body.slug = formData.slug;
      }

      if (formData.useMaxDonations && formData.maxDonations) {
        body.max_donations = parseInt(formData.maxDonations);
      }

      if (formData.useExpires && formData.expiresAt) {
        body.expires_at = new Date(formData.expiresAt).toISOString();
      }

      if (formData.useRedirect && formData.redirectUrl) {
        body.redirect_url = formData.redirectUrl;
      }

      // Streaming settings
      body.allow_messages = formData.allowMessages;
      body.show_messages = formData.showMessages;
      body.alerts_enabled = formData.alertsEnabled;
      body.alert_color = formData.alertColor;
      body.leaderboard_enabled = formData.leaderboardEnabled;

      if (formData.allowMessages && formData.maxMessageLength) {
        body.max_message_length = parseInt(formData.maxMessageLength);
      }

      if (formData.alertsEnabled) {
        body.alert_duration = parseInt(formData.alertDuration);
        body.alert_minimum_amount = parseFloat(formData.alertMinimumAmount);
      }

      if (formData.leaderboardEnabled && formData.leaderboardSize) {
        body.leaderboard_size = parseInt(formData.leaderboardSize);
      }

      await api.post("/donations", body);
      toast.success("Donation page created");
      setShowCreateModal(false);
      setCreateStep(0);
      setFormData({
        title: "",
        description: "",
        goalAmount: "",
        useGoal: false,
        suggestedAmounts: "5, 10, 25, 50, 100",
        allowCustomAmount: true,
        showProgress: true,
        thankYouMessage: "",
        useThankYou: false,
        slug: "",
        useCustomSlug: false,
        maxDonations: "",
        useMaxDonations: false,
        expiresAt: "",
        useExpires: false,
        redirectUrl: "",
        useRedirect: false,
        allowMessages: true,
        maxMessageLength: "200",
        showMessages: true,
        alertsEnabled: true,
        alertColor: "#FF006E",
        alertDuration: "5000",
        alertMinimumAmount: "0",
        leaderboardEnabled: true,
        leaderboardSize: "10",
      });
      fetchDonations();
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to create donation page";
      toast.error(message);
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
    totalDonations: donations.length,
    activeDonations: donations.filter((d) => d.is_active).length,
    totalDonors: donations.reduce((sum, d) => sum + d.donor_count, 0),
    totalRaised: donations.reduce((sum, d) => sum + d.current_amount, 0),
  };

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getProgress = (donation: Donation) => {
    if (!donation.goal_amount || donation.goal_amount <= 0) return null;
    return Math.min(
      100,
      Math.round((donation.current_amount / donation.goal_amount) * 100),
    );
  };

  const stepTitles = ["Details", "Amounts", "Options + Streaming"];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Donations</h1>
          <p className="text-muted-foreground">
            Create donation pages to accept crypto contributions
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Page
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Pages
            </CardTitle>
            <Heart className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats.totalDonations
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.activeDonations} active
            </p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-pink-500/20 to-pink-500/5" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Donors
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.totalDonors}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Unique contributions
            </p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500/20 to-blue-500/5" />
        </Card>

        <Card className="relative col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Raised
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-500">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCurrency(stats.totalRaised)
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.totalDonors > 0
                ? `${formatCurrency(stats.totalRaised / stats.totalDonors)} avg per donor`
                : "No donations yet"}
            </p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-500/50" />
        </Card>
      </div>

      {/* Donations List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Donation Pages</CardTitle>
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
          ) : donations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-4">
                <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-2xl">
                  <Heart className="text-muted-foreground h-8 w-8" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-pink-500" />
              </div>
              <h3 className="mb-1 text-lg font-semibold">
                No donation pages yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                Create your first donation page to start accepting crypto
                contributions. Perfect for open source, charities, or personal
                causes.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Page
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {donations.map((donation) => {
                const progress = getProgress(donation);
                return (
                  <div
                    key={donation.id}
                    className="group border-border/50 hover:border-border hover:bg-accent/30 flex items-center gap-4 rounded-xl border p-4 transition-all duration-200"
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                      <Heart className="h-5 w-5 text-pink-500" />
                    </div>

                    {/* Title + Slug */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {donation.title}
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span>/donate/{donation.slug}</span>
                        {donation.description && (
                          <>
                            <span className="text-border">·</span>
                            <span className="max-w-[200px] truncate">
                              {donation.description}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {progress !== null && (
                      <div className="w-24 shrink-0">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {progress}%
                          </span>
                        </div>
                        <div className="bg-muted h-2 overflow-hidden rounded-full">
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-emerald-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Raised */}
                    <div className="w-24 shrink-0 text-right">
                      <div className="font-medium text-emerald-500">
                        {formatCurrency(donation.current_amount)}
                      </div>
                      {donation.goal_amount && (
                        <div className="text-muted-foreground text-xs">
                          of {formatCurrency(donation.goal_amount)}
                        </div>
                      )}
                    </div>

                    {/* Donors */}
                    <div className="w-16 shrink-0 text-right">
                      <div className="font-medium">{donation.donor_count}</div>
                      <div className="text-muted-foreground text-xs">
                        donors
                      </div>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      <Badge
                        variant={donation.is_active ? "default" : "secondary"}
                      >
                        {donation.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          copyToClipboard(donation.url, donation.id)
                        }
                      >
                        {copiedId === donation.id ? (
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
                            onClick={() => copyToClipboard(donation.url)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(donation.url, "_blank")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/dashboard/donations/${donation.id}`)
                            }
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            View Stats
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/donations/${donation.id}/messages`,
                              )
                            }
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            View Messages
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deactivateDonation(donation.id)}
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

      {/* Create Donation Page Modal */}
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
            <DialogTitle>Create Donation Page</DialogTitle>
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
                  placeholder="e.g., Help Us Build Open Source Tools"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  This appears as the main heading on your donation page
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Tell donors why you're raising funds"
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
                    <span className="text-muted-foreground text-sm">
                      /donate/
                    </span>
                    <Input
                      placeholder="my-cause"
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

          {/* Step 1: Amounts */}
          {createStep === 1 && (
            <div className="space-y-4 py-2">
              {/* Goal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Fundraising Goal</Label>
                    <p className="text-muted-foreground text-xs">
                      Display a progress bar towards your goal
                    </p>
                  </div>
                  <Switch
                    checked={formData.useGoal}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, useGoal: checked })
                    }
                  />
                </div>
                {formData.useGoal && (
                  <div className="relative">
                    <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      type="number"
                      min="1"
                      placeholder="1000"
                      className="pl-8"
                      value={formData.goalAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, goalAmount: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Suggested Amounts */}
              <div className="space-y-2">
                <Label>Suggested Amounts (USD)</Label>
                <Input
                  placeholder="5, 10, 25, 50, 100"
                  value={formData.suggestedAmounts}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      suggestedAmounts: e.target.value,
                    })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Comma-separated list of preset donation amounts
                </p>
              </div>

              {/* Allow Custom */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Custom Amount</Label>
                  <p className="text-muted-foreground text-xs">
                    Let donors enter any amount
                  </p>
                </div>
                <Switch
                  checked={formData.allowCustomAmount}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allowCustomAmount: checked })
                  }
                />
              </div>

              {/* Show Progress */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Progress Bar</Label>
                  <p className="text-muted-foreground text-xs">
                    Display fundraising progress publicly
                  </p>
                </div>
                <Switch
                  checked={formData.showProgress}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, showProgress: checked })
                  }
                />
              </div>
            </div>
          )}

          {/* Step 2: Options */}
          {createStep === 2 && (
            <div className="space-y-4 py-2">
              {/* Thank You Message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Thank You Message</Label>
                    <p className="text-muted-foreground text-xs">
                      Shown after a successful donation
                    </p>
                  </div>
                  <Switch
                    checked={formData.useThankYou}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, useThankYou: checked })
                    }
                  />
                </div>
                {formData.useThankYou && (
                  <Input
                    placeholder="Thank you for your generous support!"
                    value={formData.thankYouMessage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thankYouMessage: e.target.value,
                      })
                    }
                  />
                )}
              </div>

              {/* Max Donations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Donation Limit</Label>
                    <p className="text-muted-foreground text-xs">
                      Limit number of donations accepted
                    </p>
                  </div>
                  <Switch
                    checked={formData.useMaxDonations}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, useMaxDonations: checked })
                    }
                  />
                </div>
                {formData.useMaxDonations && (
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g., 100"
                    value={formData.maxDonations}
                    onChange={(e) =>
                      setFormData({ ...formData, maxDonations: e.target.value })
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
                    <Label>Redirect After Donation</Label>
                    <p className="text-muted-foreground text-xs">
                      Send donors to a URL after payment
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

              {/* Streaming Settings */}
              <div className="border-border border-t pt-4">
                <div className="mb-4 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-500" />
                  <Label className="text-sm font-semibold">
                    Streaming Settings
                  </Label>
                </div>

                {/* Allow Messages */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Donor Messages</Label>
                      <p className="text-muted-foreground text-xs">
                        Let donors leave messages with their donation
                      </p>
                    </div>
                    <Switch
                      checked={formData.allowMessages}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, allowMessages: checked })
                      }
                    />
                  </div>
                  {formData.allowMessages && (
                    <div className="flex items-center justify-between pl-4">
                      <Label className="text-xs">Max Message Length</Label>
                      <Input
                        type="number"
                        min="10"
                        max="500"
                        placeholder="200"
                        value={formData.maxMessageLength}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxMessageLength: e.target.value,
                          })
                        }
                        className="w-24 text-right"
                      />
                    </div>
                  )}
                </div>

                {/* Show Messages */}
                {formData.allowMessages && (
                  <div className="mb-4 flex items-center justify-between pl-4">
                    <div>
                      <Label>Show Messages on Page</Label>
                      <p className="text-muted-foreground text-xs">
                        Display recent messages publicly
                      </p>
                    </div>
                    <Switch
                      checked={formData.showMessages}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, showMessages: checked })
                      }
                    />
                  </div>
                )}

                {/* OBS Alerts */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>OBS Alerts</Label>
                      <p className="text-muted-foreground text-xs">
                        Show alerts in OBS when donations arrive
                      </p>
                    </div>
                    <Switch
                      checked={formData.alertsEnabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, alertsEnabled: checked })
                      }
                    />
                  </div>
                  {formData.alertsEnabled && (
                    <div className="space-y-2 pl-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Alert Color</Label>
                        <div className="flex items-center gap-2">
                          <div
                            className="border-border h-6 w-6 rounded border"
                            style={{ backgroundColor: formData.alertColor }}
                          />
                          <Input
                            type="color"
                            value={formData.alertColor}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                alertColor: e.target.value,
                              })
                            }
                            className="h-8 w-16 p-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Alert Duration (ms)</Label>
                        <Input
                          type="number"
                          min="1000"
                          max="15000"
                          step="1000"
                          placeholder="5000"
                          value={formData.alertDuration}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              alertDuration: e.target.value,
                            })
                          }
                          className="w-24 text-right"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">
                          Minimum Alert Amount ($)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.50"
                          placeholder="0"
                          value={formData.alertMinimumAmount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              alertMinimumAmount: e.target.value,
                            })
                          }
                          className="w-24 text-right"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Leaderboard */}
                {formData.allowMessages && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Donation Leaderboard</Label>
                        <p className="text-muted-foreground text-xs">
                          Show top donors on the page
                        </p>
                      </div>
                      <Switch
                        checked={formData.leaderboardEnabled}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            leaderboardEnabled: checked,
                          })
                        }
                      />
                    </div>
                    {formData.leaderboardEnabled && (
                      <div className="flex items-center justify-between pl-4">
                        <Label className="text-xs">Leaderboard Size</Label>
                        <Input
                          type="number"
                          min="3"
                          max="50"
                          placeholder="10"
                          value={formData.leaderboardSize}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              leaderboardSize: e.target.value,
                            })
                          }
                          className="w-24 text-right"
                        />
                      </div>
                    )}
                  </div>
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
                    Create Page
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
