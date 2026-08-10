"use client";

import { Suspense, useState } from "react";
import { useRefunds } from "./hooks/use-refunds";
import { RefundsHeader } from "./components/refunds-header";
import { RefundsStats } from "./components/refunds-stats";
import { RefundsTable } from "./components/refunds-table";
import { RefundDetailsSheet } from "./components/refund-details-sheet";
import { CreateRefundDialog } from "./components/create-refund-dialog";

function RefundsContent() {
  const {
    loading,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    copiedId,
    selectedRefund,
    setSelectedRefund,
    copyToClipboard,
    filteredRefunds,
    stats,
    handleCreateRefund,
    handleCancelRefund,
  } = useRefunds();

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <RefundsHeader onOpenCreate={() => setShowCreateDialog(true)} />

      <RefundsStats stats={stats} loading={loading} />

      <RefundsTable
        refunds={filteredRefunds}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        copiedId={copiedId}
        copyToClipboard={copyToClipboard}
        onSelectRefund={setSelectedRefund}
        onCancelRefund={handleCancelRefund}
      />

      <RefundDetailsSheet
        selectedRefund={selectedRefund}
        setSelectedRefund={setSelectedRefund}
        copiedId={copiedId}
        copyToClipboard={copyToClipboard}
        onCancelRefund={handleCancelRefund}
      />

      <CreateRefundDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateRefund}
      />
    </div>
  );
}

export default function RefundsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading refunds...</div>}>
      <RefundsContent />
    </Suspense>
  );
}
