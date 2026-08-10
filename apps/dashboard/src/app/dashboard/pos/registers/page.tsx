"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Monitor,
  Check,
  ArrowLeft,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import Link from "next/link";

interface Register {
  object: string;
  register_id: string;
  name: string;
  location?: string;
  is_active: boolean;
  current_session_id?: string;
  total_transactions: number;
  total_volume_usd: number;
  created_at: string;
}

export default function RegistersPage() {
  const [registers, setRegisters] = useState<Register[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRegister, setEditingRegister] = useState<Register | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
  });

  const fetchRegisters = async () => {
    try {
      const res = await fetch("/api/pos/registers");
      if (res.ok) {
        const data = await res.json();
        setRegisters(data.data || []);
      }
    } catch {
      console.error("Failed to fetch registers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegisters();
  }, []);

  const resetForm = () => {
    setFormData({ name: "", location: "" });
  };

  const openEdit = (reg: Register) => {
    setEditingRegister(reg);
    setFormData({
      name: reg.name,
      location: reg.location || "",
    });
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Register name is required");
      return;
    }

    setCreating(true);
    try {
      const body: Record<string, any> = {
        name: formData.name.trim(),
      };
      if (formData.location) body.location = formData.location.trim();

      const url = editingRegister
        ? `/api/pos/registers/${editingRegister.register_id}`
        : "/api/pos/registers";

      const res = await fetch(url, {
        method: editingRegister ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to save register");
      }

      toast.success(editingRegister ? "Register updated" : "Register created");
      setShowCreateModal(false);
      setEditingRegister(null);
      resetForm();
      fetchRegisters();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save register",
      );
    } finally {
      setCreating(false);
    }
  };

  const deactivateRegister = async (id: string) => {
    try {
      const res = await fetch(`/api/pos/registers/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Register deactivated");
        fetchRegisters();
      }
    } catch {
      toast.error("Failed to deactivate register");
    }
  };

  const formatVolume = (cents: number) =>
    `$${cents.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pos">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Registers</h1>
            <p className="text-muted-foreground">
              Manage checkout terminals for your point of sale
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingRegister(null);
            setShowCreateModal(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Register
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : registers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-2xl">
                <Monitor className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="mt-4 mb-1 text-lg font-semibold">
                No registers yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                Create registers for each physical or virtual checkout terminal
                to track transactions separately.
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingRegister(null);
                  setShowCreateModal(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Register
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {registers.map((reg) => (
                <div
                  key={reg.register_id}
                  className="group hover:bg-accent/50 flex items-center gap-4 px-4 py-3 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                    <Monitor className="h-5 w-5 text-amber-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{reg.name}</span>
                      {reg.current_session_id && (
                        <Badge variant="outline" className="text-xs">
                          <Activity className="mr-1 h-3 w-3" />
                          In Session
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {reg.location || "No location set"}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {reg.total_transactions}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        transactions
                      </div>
                    </div>

                    <div className="w-24 text-right">
                      <div className="text-sm font-medium text-emerald-500">
                        {formatVolume(reg.total_volume_usd)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        volume
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Badge variant={reg.is_active ? "default" : "secondary"}>
                      {reg.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(reg)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deactivateRegister(reg.register_id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Deactivate
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

      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingRegister(null);
            resetForm();
          }
        }}
      >
        <DialogContent width="sm">
          <DialogHeader>
            <DialogTitle>
              {editingRegister ? "Edit Register" : "Add Register"}
            </DialogTitle>
            <DialogDescription>
              {editingRegister
                ? "Update register details"
                : "Create a new checkout terminal"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Front Counter"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Main entrance, register 1"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingRegister(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <div className="border-primary-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {editingRegister ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
