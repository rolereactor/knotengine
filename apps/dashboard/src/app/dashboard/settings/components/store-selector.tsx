"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { api } from "@/lib/api";
import { useSession } from "next-auth/react";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Store,
  Plus,
  Edit2,
  Trash2,
  MoreHorizontal,
  Check,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StoreItem {
  _id: string;
  storeId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

interface StoreSelectorProps {
  className?: string;
}

export function StoreSelector({ className: _className }: StoreSelectorProps) {
  const { data: session, update } = useSession();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [newStoreName, setNewStoreName] = useState("");
  const [editStoreName, setEditStoreName] = useState("");
  const [loading, setLoading] = useState(false);

  const activeMerchantId = (session?.user as { merchantId?: string })
    ?.merchantId;

  const {
    data: storesData,
    isLoading,
    mutate: mutateStores,
  } = useSWR<{ data: StoreItem[] }>(
    activeMerchantId ? `/v1/merchants/me/stores` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const stores = storesData?.data || [];
  const activeStoreId = (session as any)?.storeId as string | undefined;
  const activeStore = stores.find((s) => s.storeId === activeStoreId) || null;

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/v1/merchants/me/stores", {
        name: newStoreName.trim(),
      });
      await mutateStores();
      toast.success("Store created");
      setCreateDialogOpen(false);
      setNewStoreName("");
      // Auto-switch to the new store
      if (res.data?.storeId) {
        await update({ storeId: res.data.storeId });
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to create store", err);
      toast.error("Failed to create store");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStore = async () => {
    if (!selectedStore || !editStoreName.trim()) return;
    setLoading(true);
    try {
      await api.patch(`/v1/merchants/me/stores/${selectedStore.storeId}`, {
        name: editStoreName.trim(),
      });
      await mutateStores();
      toast.success("Store updated");
      setEditDialogOpen(false);
      setSelectedStore(null);
    } catch (err) {
      console.error("Failed to update store", err);
      toast.error("Failed to update store");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      await api.delete(`/v1/merchants/me/stores/${selectedStore.storeId}`);
      await mutateStores();
      toast.success("Store deleted");
      setDeleteDialogOpen(false);
      setSelectedStore(null);
      // If we deleted the active store, clear the store scope
      if (selectedStore.storeId === activeStoreId) {
        await update({ storeId: null });
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to delete store", err);
      toast.error("Failed to delete store");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchStore = async (storeId: string | null) => {
    try {
      await update({ storeId });
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch store", err);
      toast.error("Failed to switch store");
    }
  };

  if (isLoading) return null;

  return (
    <>
      <Card className="bg-card/40 border-border/50 hover:bg-card/60 hover:border-primary/30 group shadow-sm backdrop-blur-md transition-all">
        <CardHeader className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Store className="text-primary size-4 sm:size-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Stores</CardTitle>
                <CardDescription className="text-xs">
                  Organize products and API keys by store.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 sm:h-8 sm:gap-2 sm:px-3"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="size-3 sm:size-3.5" />
              <span className="hidden sm:inline">Add Store</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-4">
          {stores.length === 0 ? (
            <div className="border-border/40 bg-muted/10 flex flex-col items-center justify-center rounded-lg border p-6 text-center">
              <Store className="text-muted-foreground/30 mb-2 size-8" />
              <p className="text-muted-foreground text-sm font-medium">
                No stores yet
              </p>
              <p className="text-muted-foreground/60 mt-1 text-xs">
                Create a store to organize API keys and products.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Active store indicator */}
              <div className="border-border/40 bg-muted/10 flex items-center justify-between rounded-lg border p-2 sm:p-3">
                <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase">
                  Active Store
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-xs font-semibold"
                    >
                      {activeStore?.name || "All Stores"}
                      <ChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Switch Store
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleSwitchStore(null)}
                      className="cursor-pointer gap-2 p-2 text-sm font-medium"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border">
                        <Store className="size-3" />
                      </div>
                      <span className="flex-1">All Stores</span>
                      {!activeStoreId && <Check className="size-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {stores.map((store) => (
                      <DropdownMenuItem
                        key={store.storeId}
                        onClick={() => handleSwitchStore(store.storeId)}
                        className="cursor-pointer gap-2 p-2 text-sm font-medium"
                      >
                        <div className="flex size-6 items-center justify-center rounded-md border">
                          <Store className="size-3" />
                        </div>
                        <span className="flex-1 truncate">{store.name}</span>
                        {store.storeId === activeStoreId && (
                          <Check className="size-4" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Store list */}
              {stores.map((store) => (
                <div
                  key={store.storeId}
                  className={cn(
                    "border-border/40 bg-muted/10 flex items-center justify-between rounded-lg border p-2 transition-colors sm:p-3",
                    store.storeId === activeStoreId &&
                      "border-primary/30 bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
                      <Store className="text-primary size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {store.name}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {store.storeId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {store.storeId === activeStoreId && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-none px-1.5 py-0 text-[9px] font-bold"
                      >
                        Active
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                        >
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedStore(store);
                            setEditStoreName(store.name);
                            setEditDialogOpen(true);
                          }}
                          className="cursor-pointer gap-2 p-2 text-sm font-medium"
                        >
                          <Edit2 className="size-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedStore(store);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:bg-destructive/10 cursor-pointer gap-2 p-2 text-sm font-medium"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Store Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-96">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="text-primary size-5" />
              Create Store
            </DialogTitle>
            <DialogDescription>
              Add a new store to organize products and API keys.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="storeName">Store Name</Label>
            <Input
              id="storeName"
              placeholder="My Store"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              autoFocus
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateDialogOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateStore}
              disabled={loading || !newStoreName.trim()}
            >
              {loading ? "Creating..." : "Create Store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Store Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-96">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="text-primary size-5" />
              Edit Store
            </DialogTitle>
            <DialogDescription>Update the store name.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="editStoreName">Store Name</Label>
            <Input
              id="editStoreName"
              value={editStoreName}
              onChange={(e) => setEditStoreName(e.target.value)}
              autoFocus
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditStore}
              disabled={loading || !editStoreName.trim()}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Store Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-96">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="text-destructive size-5" />
              Delete Store
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedStore?.name}&quot;?
              This action cannot be undone. API keys scoped to this store will
              stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStore}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
