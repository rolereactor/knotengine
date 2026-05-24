"use client";

import { useState } from "react";
import { useSettings } from "./hooks/use-settings";
import { MerchantDetailsCard } from "./components/merchant-details-card";
import { AppearanceCard } from "./components/appearance-card";
import { TwoFactorCard } from "./components/two-factor-card";
import { PaymentEngineCard } from "./components/payment-engine-card";
import { TwoFASetupDialog } from "./components/two-fa-setup-dialog";
import { TwoFADisableDialog } from "./components/two-fa-disable-dialog";
import { DangerZoneCard } from "./components/danger-zone-card";
import { SuccessToast } from "./components/success-toast";
import { SubNavLayout } from "@/components/sub-nav-layout";
import { Store, ShieldCheck, Sliders, Trash2 } from "lucide-react";

const sections = [
  { label: "Merchant Profile", value: "merchant", icon: Store },
  { label: "Security", value: "security", icon: ShieldCheck },
  { label: "Payment Engine", value: "payment", icon: Sliders },
  { label: "Danger Zone", value: "danger", icon: Trash2 },
];

export default function SettingsPage() {
  const {
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
    handleSave,
    handleDeleteMerchant,
    handleSetup2FA,
    handleEnable2FA,
    handleDisable2FA,
  } = useSettings();

  const [activeSection, setActiveSection] = useState("merchant");

  return (
    <>
      <SubNavLayout
        title="Settings"
        description="Manage your merchant configuration and preferences."
        items={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        {activeSection === "merchant" && (
          <div className="flex flex-col gap-6">
            <MerchantDetailsCard
              formData={formData}
              onSave={handleSave}
              saving={saving}
              currentPlan={formData.plan}
            />
            <AppearanceCard
              formData={formData}
              onSave={handleSave}
              saving={saving}
              currentPlan={formData.plan}
            />
          </div>
        )}

        {activeSection === "security" && (
          <TwoFactorCard
            twoFactorEnabled={twoFactorEnabled}
            onEnable={handleSetup2FA}
            onDisable={() => {
              setTwoFADisableDialogOpen(true);
              setTwoFACode("");
              setTwoFAError("");
            }}
            loading={twoFALoading}
          />
        )}

        {activeSection === "payment" && (
          <PaymentEngineCard
            formData={formData}
            onSave={handleSave}
            saving={saving}
          />
        )}

        {activeSection === "danger" && (
          <DangerZoneCard
            businessName={formData.businessName}
            isDeleteDialogOpen={deleteDialogOpen}
            setIsDeleteDialogOpen={setDeleteDialogOpen}
            deleteConfirmationName={deleteConfirmationName}
            setDeleteConfirmationName={setDeleteConfirmationName}
            onDelete={handleDeleteMerchant}
            isDeleting={deleting}
          />
        )}
      </SubNavLayout>

      <TwoFASetupDialog
        open={twoFASetupDialogOpen}
        onOpenChange={setTwoFASetupDialogOpen}
        setupData={twoFASetupData}
        twoFACode={twoFACode}
        setTwoFACode={setTwoFACode}
        error={twoFAError}
        loading={twoFALoading}
        onVerify={handleEnable2FA}
        showBackupCodes={showBackupCodes}
        backupCodes={backupCodes}
      />

      <TwoFADisableDialog
        open={twoFADisableDialogOpen}
        onOpenChange={setTwoFADisableDialogOpen}
        twoFACode={twoFACode}
        setTwoFACode={setTwoFACode}
        error={twoFAError}
        loading={twoFALoading}
        onDisable={handleDisable2FA}
      />

      <SuccessToast show={success} />
    </>
  );
}
