"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Tags,
  Check,
  ArrowLeft,
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

interface Category {
  object: string;
  category_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sort_order: "0",
  });

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/pos/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.data || []);
      }
    } catch {
      console.error("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setFormData({ name: "", description: "", sort_order: "0" });
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || "",
      sort_order: String(cat.sort_order),
    });
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setCreating(true);
    try {
      const body: Record<string, any> = {
        name: formData.name.trim(),
      };
      if (formData.description) body.description = formData.description.trim();
      if (formData.sort_order) body.sort_order = parseInt(formData.sort_order);

      const url = editingCategory
        ? `/api/pos/categories/${editingCategory.category_id}`
        : "/api/pos/categories";

      const res = await fetch(url, {
        method: editingCategory ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to save category");
      }

      toast.success(editingCategory ? "Category updated" : "Category created");
      setShowCreateModal(false);
      setEditingCategory(null);
      resetForm();
      fetchCategories();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save category",
      );
    } finally {
      setCreating(false);
    }
  };

  const deactivateCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/pos/categories/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Category deactivated");
        fetchCategories();
      }
    } catch {
      toast.error("Failed to deactivate category");
    }
  };

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
            <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">
              Organize your products into categories
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingCategory(null);
            setShowCreateModal(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-2xl">
                <Tags className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="mt-4 mb-1 text-lg font-semibold">
                No categories yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                Create categories to organize your products for easier browsing
                in the checkout.
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingCategory(null);
                  setShowCreateModal(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Category
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {categories.map((cat) => (
                <div
                  key={cat.category_id}
                  className="group hover:bg-accent/50 flex items-center gap-4 px-4 py-3 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                    <Tags className="h-5 w-5 text-purple-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{cat.name}</div>
                    {cat.description && (
                      <div className="text-muted-foreground truncate text-sm">
                        {cat.description}
                      </div>
                    )}
                  </div>

                  <div className="text-muted-foreground w-16 shrink-0 text-right text-sm">
                    Order: {cat.sort_order}
                  </div>

                  <div className="shrink-0">
                    <Badge variant={cat.is_active ? "default" : "secondary"}>
                      {cat.is_active ? "Active" : "Inactive"}
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
                        <DropdownMenuItem onClick={() => openEdit(cat)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deactivateCategory(cat.category_id)}
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
            setEditingCategory(null);
            resetForm();
          }
        }}
      >
        <DialogContent width="sm">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update category details"
                : "Create a new category to organize products"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Beverages"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort">Sort Order</Label>
              <Input
                id="sort"
                type="number"
                min="0"
                placeholder="0"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData({ ...formData, sort_order: e.target.value })
                }
              />
              <p className="text-muted-foreground text-xs">
                Lower numbers appear first
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingCategory(null);
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
              {editingCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
