"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Paintbrush,
  Globe,
  Code,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface WhiteLabelSettings {
  whiteLabelEnabled: boolean;
  customCss: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  checkoutLayout: string;
  invoiceFooterHtml: string;
  hideNetworkInfo: boolean;
  hideQrCode: boolean;
  redirectAfterPayment: string;
  customReceiptMessage: string;
}

interface EmbedCode {
  iframe_html: string;
  script_html: string;
  checkout_url: string;
}

export default function WhiteLabelPage() {
  const [settings, setSettings] = useState<WhiteLabelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [embedCode, setEmbedCode] = useState<EmbedCode | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cssWarnings, setCssWarnings] = useState<string[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/merchants/me");
        setSettings({
          whiteLabelEnabled: data.white_label_enabled || false,
          customCss: data.custom_css || "",
          customDomain: data.custom_domain || null,
          customDomainVerified: data.custom_domain_verified || false,
          checkoutLayout: data.checkout_layout || "default",
          invoiceFooterHtml: data.invoice_footer_html || "",
          hideNetworkInfo: data.hide_network_info || false,
          hideQrCode: data.hide_qr_code || false,
          redirectAfterPayment: data.redirect_after_payment || "",
          customReceiptMessage: data.custom_receipt_message || "",
        });
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveSettings = async (updates: Partial<WhiteLabelSettings>) => {
    setSaving(true);
    try {
      await api.patch("/merchants/me", {
        white_label_enabled: updates.whiteLabelEnabled,
        custom_css: updates.customCss,
        checkout_layout: updates.checkoutLayout,
        invoice_footer_html: updates.invoiceFooterHtml,
        hide_network_info: updates.hideNetworkInfo,
        hide_qr_code: updates.hideQrCode,
        redirect_after_payment: updates.redirectAfterPayment,
        custom_receipt_message: updates.customReceiptMessage,
      });

      setSettings((prev) => (prev ? { ...prev, ...updates } : null));
      toast.success("Settings saved");
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to save settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const validateCss = async (css: string) => {
    try {
      const { data } = await api.post("/white-label/preview", {
        custom_css: css,
      });
      setCssWarnings(data.warnings || []);
    } catch {
      // Silently fail
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) return;

    setAddingDomain(true);
    try {
      const { data } = await api.post("/white-label/domains", {
        domain: newDomain.trim(),
      });

      setSettings((prev) =>
        prev
          ? {
              ...prev,
              customDomain: data.domain,
              customDomainVerified: false,
            }
          : null,
      );
      setShowAddDomain(false);
      setNewDomain("");
      toast.success("Domain added. Please verify DNS settings.");
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to add domain";
      toast.error(message);
    } finally {
      setAddingDomain(false);
    }
  };

  const removeDomain = async () => {
    if (!settings?.customDomain) return;

    try {
      await api.delete(`/white-label/domains/${settings.customDomain}`);
      setSettings((prev) =>
        prev
          ? { ...prev, customDomain: null, customDomainVerified: false }
          : null,
      );
      toast.success("Domain removed");
    } catch {
      toast.error("Failed to remove domain");
    }
  };

  const verifyDomain = async () => {
    if (!settings?.customDomain) return;

    try {
      await api.post(`/white-label/domains/${settings.customDomain}/verify`);
      setSettings((prev) =>
        prev ? { ...prev, customDomainVerified: true } : null,
      );
      toast.success("Domain verified successfully");
    } catch {
      toast.error("Verification failed. Check DNS settings.");
    }
  };

  const fetchEmbedCode = async () => {
    try {
      const { data } = await api.get("/white-label/embed", {
        params: { width: 400, height: 600 },
      });
      setEmbedCode(data);
    } catch {
      toast.error("Failed to load embed code");
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">White Label</h1>
        <p className="text-muted-foreground">
          Customize your checkout experience with custom branding and domains
        </p>
      </div>

      {/* Enable White Label */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5" />
                White Label Settings
              </CardTitle>
              <CardDescription>
                Enable custom branding for your checkout pages
              </CardDescription>
            </div>
            <Switch
              checked={settings.whiteLabelEnabled}
              onCheckedChange={(checked) =>
                saveSettings({ whiteLabelEnabled: checked })
              }
            />
          </div>
        </CardHeader>
      </Card>

      {/* Custom CSS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Custom CSS
          </CardTitle>
          <CardDescription>
            Add custom CSS to style your checkout page (Enterprise plan only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="/* Add your custom CSS here */&#10;.checkout-container {&#10;  border-radius: 16px;&#10;}"
            value={settings.customCss}
            onChange={(e) => {
              setSettings({ ...settings, customCss: e.target.value });
              validateCss(e.target.value);
            }}
            rows={10}
            className="font-mono text-sm"
          />
          {cssWarnings.length > 0 && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-yellow-500">
                <AlertCircle className="h-4 w-4" />
                CSS Warnings
              </div>
              <ul className="text-muted-foreground space-y-1 text-xs">
                {cssWarnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
          <Button
            onClick={() => saveSettings({ customCss: settings.customCss })}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save CSS
          </Button>
        </CardContent>
      </Card>

      {/* Custom Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Domain
          </CardTitle>
          <CardDescription>
            Use your own domain for checkout pages (Enterprise plan only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.customDomain ? (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{settings.customDomain}</span>
                    <Badge
                      variant={
                        settings.customDomainVerified ? "default" : "secondary"
                      }
                    >
                      {settings.customDomainVerified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                  {!settings.customDomainVerified && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Add this TXT record to your DNS:{" "}
                      <code className="bg-muted rounded px-1">
                        knotengine-domain-verification=YOUR_MERCHANT_ID
                      </code>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!settings.customDomainVerified && (
                    <Button variant="outline" size="sm" onClick={verifyDomain}>
                      Verify
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={removeDomain}>
                    <Trash2 className="text-destructive h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowAddDomain(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Domain
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Checkout Layout */}
      <Card>
        <CardHeader>
          <CardTitle>Checkout Layout</CardTitle>
          <CardDescription>
            Choose how your checkout page appears to customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "default", label: "Default", desc: "Standard layout" },
              { value: "minimal", label: "Minimal", desc: "Clean and simple" },
              { value: "full", label: "Full Width", desc: "Spans entire page" },
            ].map((layout) => (
              <button
                key={layout.value}
                onClick={() => saveSettings({ checkoutLayout: layout.value })}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  settings.checkoutLayout === layout.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border/80"
                }`}
              >
                <div className="text-sm font-medium">{layout.label}</div>
                <div className="text-muted-foreground text-xs">
                  {layout.desc}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Options */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Hide Network Info</Label>
              <p className="text-muted-foreground text-xs">
                Hide blockchain network details from customers
              </p>
            </div>
            <Switch
              checked={settings.hideNetworkInfo}
              onCheckedChange={(checked) =>
                saveSettings({ hideNetworkInfo: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Hide QR Code</Label>
              <p className="text-muted-foreground text-xs">
                Don&apos;t show QR code on checkout
              </p>
            </div>
            <Switch
              checked={settings.hideQrCode}
              onCheckedChange={(checked) =>
                saveSettings({ hideQrCode: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Redirect After Payment</Label>
            <Input
              type="url"
              placeholder="https://example.com/thank-you"
              value={settings.redirectAfterPayment}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  redirectAfterPayment: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Custom Receipt Message</Label>
            <Textarea
              placeholder="Thank you for your payment! Your order is being processed."
              value={settings.customReceiptMessage}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  customReceiptMessage: e.target.value,
                })
              }
              rows={3}
            />
          </div>

          <Button onClick={() => saveSettings(settings)} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Options
          </Button>
        </CardContent>
      </Card>

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Embed Checkout
              </CardTitle>
              <CardDescription>
                Embed your checkout page on any website
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchEmbedCode}>
              Generate Code
            </Button>
          </div>
        </CardHeader>
        {embedCode && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Iframe Code</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(embedCode.iframe_html, "iframe")
                  }
                >
                  {copiedField === "iframe" ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs">
                {embedCode.iframe_html}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Script Code</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(embedCode.script_html, "script")
                  }
                >
                  {copiedField === "script" ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs">
                {embedCode.script_html}
              </pre>
            </div>

            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4" />
              <a
                href={embedCode.checkout_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {embedCode.checkout_url}
              </a>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={showAddDomain} onOpenChange={setShowAddDomain}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Domain Name</Label>
              <Input
                placeholder="checkout.yourdomain.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Enter the domain where you want to host your checkout page
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDomain(false)}>
              Cancel
            </Button>
            <Button
              onClick={addDomain}
              disabled={addingDomain || !newDomain.trim()}
            >
              {addingDomain && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
