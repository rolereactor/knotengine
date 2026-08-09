"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { fetcher, swrKeys } from "@/lib/swr";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MerchantSettings, TwoFASetupData } from "../types";
import { toast } from "sonner";

interface MerchantResponse {
  merchantId?: string;
  _id?: string;
  name?: string;
  email?: string;
  logoUrl?: string;
  returnUrl?: string;
  theme?: string;
  brandColor?: string;
  brandingEnabled?: boolean;
  removeBranding?: boolean;
  brandingAlignment?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  feeResponsibility?: string;
  invoiceExpirationMinutes?: number;
  underpaymentTolerancePercentage?: number;
  bip21Enabled?: boolean;
  enabledCurrencies?: string[];
  plan?: string;
  twoFactorEnabled?: boolean;
  lightningEnabled?: boolean;
  lightningProvider?: string;
  lndEndpoint?: string;
  lndMacaroon?: string;
  lndCert?: string;
  clnEndpoint?: string;
  clnRune?: string;
}

function mapMerchantToFormData(m: MerchantResponse): MerchantSettings {
  return {
    merchantId: m.merchantId || m._id || "",
    businessName: m.name || "",
    businessEmail: m.email || "",
    logoUrl: m.logoUrl || "",
    returnUrl: m.returnUrl || "",
    theme: (m.theme as MerchantSettings["theme"]) || "system",
    brandColor: m.brandColor || "#ffffff",
    brandingEnabled: m.brandingEnabled ?? true,
    removeBranding: m.removeBranding ?? false,
    brandingAlignment:
      (m.brandingAlignment as MerchantSettings["brandingAlignment"]) || "left",
    webhookUrl: m.webhookUrl || "",
    webhookSecret: m.webhookSecret || "",
    feeResponsibility:
      (m.feeResponsibility as MerchantSettings["feeResponsibility"]) ||
      "client",
    invoiceExpirationMinutes: m.invoiceExpirationMinutes || 60,
    underpaymentTolerancePercentage: m.underpaymentTolerancePercentage || 0,
    bip21Enabled: m.bip21Enabled ?? true,
    enabledCurrencies: m.enabledCurrencies || [],
    plan: (m.plan as MerchantSettings["plan"]) || "starter",
    lightningEnabled: m.lightningEnabled ?? false,
    lightningProvider:
      (m.lightningProvider as MerchantSettings["lightningProvider"]) || "lnd",
    lndEndpoint: m.lndEndpoint || "",
    lndMacaroon: m.lndMacaroon || "",
    lndCert: m.lndCert || "",
    clnEndpoint: m.clnEndpoint || "",
    clnRune: m.clnRune || "",
  };
}

export function useSettings() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");

  const router = useRouter();
  const { update } = useSession();

  const {
    data: merchantData,
    isLoading: loading,
    mutate: mutateMerchant,
  } = useSWR<MerchantResponse>(swrKeys.merchant, fetcher, {
    revalidateOnFocus: false,
  });

  const formData = merchantData
    ? mapMerchantToFormData(merchantData)
    : ({
        merchantId: "",
        businessName: "",
        businessEmail: "",
        logoUrl: "",
        returnUrl: "",
        theme: "system",
        brandColor: "#ffffff",
        brandingEnabled: true,
        removeBranding: false,
        brandingAlignment: "left",
        webhookUrl: "",
        webhookSecret: "",
        feeResponsibility: "merchant",
        invoiceExpirationMinutes: 60,
        underpaymentTolerancePercentage: 1,
        bip21Enabled: true,
        enabledCurrencies: [],
        plan: "starter",
        lightningEnabled: false,
        lightningProvider: "lnd",
        lndEndpoint: "",
        lndMacaroon: "",
        lndCert: "",
        clnEndpoint: "",
        clnRune: "",
      } satisfies MerchantSettings);

  const twoFactorEnabled = merchantData?.twoFactorEnabled || false;
  const [twoFASetupDialogOpen, setTwoFASetupDialogOpen] = useState(false);
  const [twoFADisableDialogOpen, setTwoFADisableDialogOpen] = useState(false);
  const [twoFASetupData, setTwoFASetupData] = useState<TwoFASetupData | null>(
    null,
  );
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const handleSave = async (newData?: MerchantSettings) => {
    const dataToSave = newData || formData;
    setSaving(true);
    setSuccess(false);
    try {
      await api.patch("/v1/merchants/me", {
        name: dataToSave.businessName,
        email: dataToSave.businessEmail,
        logoUrl: dataToSave.logoUrl,
        returnUrl: dataToSave.returnUrl,
        theme: dataToSave.theme,
        brandColor: dataToSave.brandColor,
        brandingEnabled: dataToSave.brandingEnabled,
        removeBranding: dataToSave.removeBranding,
        brandingAlignment: dataToSave.brandingAlignment,
        feeResponsibility: dataToSave.feeResponsibility,
        invoiceExpirationMinutes: dataToSave.invoiceExpirationMinutes,
        underpaymentTolerancePercentage:
          dataToSave.underpaymentTolerancePercentage,
        bip21Enabled: dataToSave.bip21Enabled,
        enabledCurrencies: dataToSave.enabledCurrencies,
        lightningEnabled: dataToSave.lightningEnabled,
        lightningProvider: dataToSave.lightningProvider,
        lndEndpoint: dataToSave.lndEndpoint,
        lndMacaroon: dataToSave.lndMacaroon,
        lndCert: dataToSave.lndCert,
        clnEndpoint: dataToSave.clnEndpoint,
        clnRune: dataToSave.clnRune,
      });

      // Revalidate SWR cache with fresh data
      await mutateMerchant();
      // Refresh session so merchant switcher re-fetches and shows the new logo
      await update();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error("Failed to save settings", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMerchant = async () => {
    setDeleting(true);
    try {
      await api.delete("/v1/merchants/me");
      await update();
      router.push("/dashboard");
      window.location.reload();
    } catch (err: unknown) {
      console.error("Failed to delete merchant", err);
      toast.error("Failed to delete merchant");
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    setTwoFAError("");
    setTwoFACode("");
    setBackupCodes([]);
    setShowBackupCodes(false);
    try {
      const res = await api.post("/v1/merchants/me/2fa/setup");
      setTwoFASetupData({
        secret: res.data.secret,
        qrCode: res.data.qrCode,
      });
      setTwoFASetupDialogOpen(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to start 2FA setup.";
      setTwoFAError(message);
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (twoFACode.length !== 6) return;
    setTwoFALoading(true);
    setTwoFAError("");
    try {
      const res = await api.post("/v1/merchants/me/2fa/enable", {
        code: twoFACode,
      });
      setBackupCodes(res.data.backupCodes || []);
      setShowBackupCodes(true);
      await mutateMerchant(); // Refresh to pick up twoFactorEnabled
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Invalid code. Please try again.";
      setTwoFAError(message);
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (twoFACode.length !== 6) return;
    setTwoFALoading(true);
    setTwoFAError("");
    try {
      await api.post("/v1/merchants/me/2fa/disable", { code: twoFACode });
      await mutateMerchant(); // Refresh to pick up twoFactorEnabled
      setTwoFADisableDialogOpen(false);
      setTwoFACode("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Invalid code. Please try again.";
      setTwoFAError(message);
    } finally {
      setTwoFALoading(false);
    }
  };

  return {
    loading,
    saving,
    success,
    deleting,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteConfirmationName,
    setDeleteConfirmationName,
    formData,
    twoFactorEnabled,
    twoFASetupDialogOpen,
    setTwoFASetupDialogOpen,
    twoFADisableDialogOpen,
    setTwoFADisableDialogOpen,
    twoFASetupData,
    twoFACode,
    setTwoFACode,
    twoFALoading,
    twoFAError,
    setTwoFAError,
    backupCodes,
    showBackupCodes,
    setShowBackupCodes,
    handleSave,
    handleDeleteMerchant,
    handleSetup2FA,
    handleEnable2FA,
    handleDisable2FA,
  };
}
