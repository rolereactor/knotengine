import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Send,
  Save,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn, dedent } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";
import { useWebhooks } from "../hooks/use-webhooks";
import { useWebhookDeliveries } from "../hooks/use-webhook-deliveries";
import { webhookSchema, WebhookFormData } from "../../settings/types";

export function WebhooksTab() {
  const {
    webhookData,
    copied,
    savingWebhooks,
    webhookSuccess,
    testingWebhook,
    showWebhookSecret,
    setShowWebhookSecret,
    rotatingWebhookSecret,
    selectedLanguage,
    setSelectedLanguage,
    copyToClipboard,
    handleSaveWebhooks,
    handleRotateWebhookSecret,
    handleTestWebhook,
  } = useWebhooks();

  const {
    deliveries,
    stats,
    loading: deliveriesLoading,
    page,
    totalPages,
    setPage,
    statusFilter,
    setStatusFilter,
  } = useWebhookDeliveries();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      webhookUrl: webhookData.webhookUrl,
      webhookEvents: webhookData.webhookEvents,
    },
    mode: "onChange",
  });

  useEffect(() => {
    reset({
      webhookUrl: webhookData.webhookUrl,
      webhookEvents: webhookData.webhookEvents,
    });
  }, [
    reset,
    webhookData.webhookUrl,
    JSON.stringify(webhookData.webhookEvents),
  ]);

  const onSave = async (data: WebhookFormData) => {
    // We need to manually call the save handler with current form data
    // since the hook doesn't know about RHF state yet
    await handleSaveWebhooks(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Endpoint Configuration</h3>
          <p className="text-muted-foreground text-xs">
            Set the URL where KnotEngine will send POST requests when events
            occur.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[10px] font-bold tracking-wider uppercase"
            onClick={handleTestWebhook}
            disabled={!webhookData.webhookUrl || testingWebhook}
          >
            {testingWebhook ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Send className="size-3" />
            )}
            Test
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-[10px] font-bold tracking-wider uppercase"
            onClick={handleSubmit(onSave)}
            disabled={savingWebhooks || !isValid}
          >
            {savingWebhooks ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Save className="size-3" />
            )}
            {webhookSuccess ? "Saved" : "Save Changes"}
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="space-y-6 pt-6 pb-6">
          <div className="grid gap-2">
            <Label
              htmlFor="webhookUrl"
              className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
            >
              Endpoint URL
            </Label>
            <Input
              id="webhookUrl"
              {...register("webhookUrl", {
                onBlur: (e) => {
                  const val = e.target.value.trim();
                  if (
                    val &&
                    !val.startsWith("http://") &&
                    !val.startsWith("https://") &&
                    !val.startsWith("/")
                  ) {
                    setValue("webhookUrl", `https://${val}`, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }
                },
              })}
              placeholder="https://api.myapp.com/webhooks"
              className={cn(
                "bg-background/50 font-mono text-xs focus-visible:ring-emerald-500/30",
                errors.webhookUrl &&
                  "border-destructive focus-visible:ring-destructive",
              )}
            />
            {errors.webhookUrl && (
              <p className="text-destructive text-[10px] font-medium">
                {errors.webhookUrl.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="secret"
                className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
              >
                Signing Secret
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotateWebhookSecret}
                disabled={rotatingWebhookSecret}
                className="text-destructive hover:bg-destructive/5 hover:text-destructive h-6 text-[9px] font-bold tracking-wider uppercase"
              >
                {rotatingWebhookSecret ? "Rotating..." : "Rotate Secret"}
              </Button>
            </div>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="secret"
                  type={showWebhookSecret ? "text" : "password"}
                  value={webhookData.webhookSecret}
                  readOnly
                  className="bg-background/50 pr-16 font-mono text-xs focus-visible:ring-0"
                  placeholder="knot_wh_********************"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground absolute top-0 right-0 h-full text-[10px] font-bold tracking-wider uppercase hover:bg-transparent"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  disabled={!webhookData.webhookSecret}
                >
                  {showWebhookSecret ? "Hide" : "Reveal"}
                </Button>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() =>
                  copyToClipboard(webhookData.webhookSecret, "secret")
                }
              >
                {copied === "secret" ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="text-muted-foreground size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold tracking-tight text-emerald-600 uppercase">
                Security Policy
              </span>
            </div>
            <p className="text-muted-foreground text-[10.5px] leading-relaxed">
              Always verify the{" "}
              <code className="font-mono text-emerald-600">
                x-knot-signature
              </code>{" "}
              header using your secret before processing webhooks to ensure the
              source is authentic.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-sm font-semibold">
            Event Subscriptions
          </CardTitle>
          <CardDescription className="text-xs">
            Select the specific events you want to receive notifications for.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pt-0 pb-6">
          <Controller
            name="webhookEvents"
            control={control}
            render={({ field }) => (
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {[
                  {
                    id: "e-confirmed",
                    key: "invoice.confirmed",
                    desc: "Fired when an invoice reaches required confirmations.",
                  },
                  {
                    id: "e-mempool",
                    key: "invoice.mempool_detected",
                    desc: "Fired immediately when a transaction is seen in mempool.",
                  },
                  {
                    id: "e-failed",
                    key: "invoice.failed",
                    desc: "Fired when an invoice expires or remains unpaid.",
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="hover:border-border/50 hover:bg-muted/30 group flex items-start gap-3 rounded-lg border border-transparent p-2.5 transition-all"
                  >
                    <Checkbox
                      id={item.id}
                      checked={field.value.includes(item.key)}
                      onCheckedChange={(checked) => {
                        const events = field.value;
                        if (checked) {
                          field.onChange([...events, item.key]);
                        } else {
                          field.onChange(events.filter((e) => e !== item.key));
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="grid gap-0.5 leading-none">
                      <Label
                        htmlFor={item.id}
                        className="group-hover:text-primary cursor-pointer text-xs font-bold transition-colors"
                      >
                        {item.key}
                      </Label>
                      <p className="text-muted-foreground text-[10px] font-medium">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Card className="relative w-full overflow-hidden border bg-[#0c0c0c] text-slate-50 shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-50">
                Payload preview
              </h3>
              <p className="text-xs text-slate-400">
                Sample HTTP request structure sent to your server.
              </p>
            </div>
            <CodeBlock
              language="json"
              className="h-100 w-full"
              code={dedent`
                POST /webhooks HTTP/1.1
                x-knot-signature: 8f...2a
                x-knot-event: invoice.confirmed
                Content-Type: application/json

                {
                  "id": "evt_test_1234567890",
                  "event": "invoice.confirmed",
                  "created": 1700000000,
                  "invoice_id": "inv_test_1234567890",
                  "status": "confirmed",
                  "amount": {
                    "usd": 100.0,
                    "crypto": 0.0015,
                    "currency": "BTC",
                    "fee_usd": 1.0
                  },
                  "payment": {
                    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                    "tx_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
                    "confirmations": 2,
                    "paid_at": "2024-02-21T01:52:45.000Z"
                  },
                  "metadata": {
                    "is_test": true
                  }
                }
              `}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative mt-6 overflow-hidden border bg-[#0c0c0c] text-slate-50 shadow-sm">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-10">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-50">
                  Implementation Guide
                </h3>
                <p className="text-xs text-slate-400">
                  A quick reference for verifying webhook signatures.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <h4 className="text-sm font-bold text-slate-50">
                    Signature verification
                  </h4>
                </div>
                <p className="max-w-sm text-[13px] leading-relaxed text-slate-400">
                  Webhooks are signed with a{" "}
                  <code className="relative z-10 mx-1 rounded bg-white/5 px-1 py-0.5 text-xs text-slate-300 select-none">
                    HMAC-SHA256
                  </code>{" "}
                  hash of the raw request body using your signing secret. We
                  recommend using a timing-safe comparison to prevent
                  side-channel attacks.
                </p>
                <div className="flex pt-2">
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs text-slate-300 hover:text-white"
                    asChild
                  >
                    <a href="#">
                      View docs <ExternalLink className="ml-1.5 size-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center">
                <div className="flex rounded-lg border border-white/5 bg-white/5 p-1">
                  <button
                    onClick={() => setSelectedLanguage("nodejs-sdk")}
                    className={cn(
                      "rounded-md px-3 py-1 text-[10px] font-bold tracking-tight uppercase transition-all",
                      selectedLanguage === "nodejs-sdk"
                        ? "border border-white/5 bg-[#0A0A0A] text-slate-100 shadow-sm"
                        : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    Node.js SDK
                  </button>
                  <button
                    onClick={() => setSelectedLanguage("nodejs")}
                    className={cn(
                      "rounded-md px-3 py-1 text-[10px] font-bold tracking-tight uppercase transition-all",
                      selectedLanguage === "nodejs"
                        ? "border border-white/5 bg-[#0A0A0A] text-slate-100 shadow-sm"
                        : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    Node.js
                  </button>
                </div>
              </div>

              <CodeBlock
                className="h-100"
                language="typescript"
                code={
                  selectedLanguage === "nodejs-sdk"
                    ? dedent`
                        import { KnotClient } from '@qodinger/knot-sdk';

                        const knot = new KnotClient({
                          apiKey: process.env.KNOT_API_KEY,
                          webhookSecret: process.env.KNOT_WEBHOOK_SECRET
                        });

                        // 1. Get signature from headers
                        const signature = req.headers['x-knot-signature'];

                        // 2. Verify automatically via SDK
                        const isValid = knot.verifyWebhook(req.rawBody, signature);
                      `
                    : dedent`
                        import crypto from 'crypto';

                        // 1. Get signature & raw body
                        const signature = req.headers['x-knot-signature'];
                        const rawBody = req.rawBody; // Required for HMAC!

                        // 2. Generate expected HMAC-SHA256 signature
                        const expected = crypto
                          .createHmac('sha256', process.env.KNOT_WEBHOOK_SECRET)
                          .update(rawBody)
                          .digest('hex');

                        // 3. Timing-safe comparison to prevent side-channel attacks
                        const sigBuf = Buffer.from(signature, 'hex');
                        const expBuf = Buffer.from(expected, 'hex');

                        let isValid = false;
                        if (sigBuf.length === expBuf.length) {
                          isValid = crypto.timingSafeEqual(sigBuf, expBuf);
                        }
                      `
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Logs */}
      {stats && stats.total > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Delivery Logs
                </CardTitle>
                <CardDescription className="text-xs">
                  Recent webhook delivery attempts and their status.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {stats && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 className="size-3" />
                      {stats.success}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="size-3" />
                      {stats.failed}
                    </span>
                    <span className="text-muted-foreground">
                      {stats.successRate}% success
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pt-0 pb-6">
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant={statusFilter === "" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter("")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "success" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter("success")}
              >
                Success
              </Button>
              <Button
                variant={statusFilter === "failed" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter("failed")}
              >
                Failed
              </Button>
            </div>

            {deliveriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              </div>
            ) : deliveries.length > 0 ? (
              <div className="space-y-2">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery._id}
                    className="border-border/30 bg-muted/10 flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {delivery.status === "success" ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : delivery.status === "failed" ? (
                        <XCircle className="size-4 text-red-500" />
                      ) : (
                        <Clock className="size-4 text-amber-500" />
                      )}
                      <div>
                        <p className="text-xs font-medium">
                          {delivery.eventType}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {delivery.invoiceId} • Attempt #{delivery.attempt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {delivery.statusCode && (
                          <Badge
                            variant={
                              delivery.statusCode >= 200 &&
                              delivery.statusCode < 300
                                ? "default"
                                : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {delivery.statusCode}
                          </Badge>
                        )}
                        {delivery.errorMessage && (
                          <div className="text-destructive flex items-center gap-1 text-[10px]">
                            <AlertCircle className="size-3" />
                            {delivery.errorMessage.substring(0, 30)}...
                          </div>
                        )}
                      </div>
                      <div className="text-muted-foreground text-right text-[10px]">
                        <p>{delivery.duration}ms</p>
                        <p>
                          {new Date(delivery.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground/50 flex items-center justify-center py-8 text-sm">
                No delivery logs found.
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground text-xs">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
