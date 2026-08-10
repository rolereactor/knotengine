"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Package,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";

interface Product {
  object: string;
  product_id: string;
  name: string;
  description?: string;
  price_usd: number;
  category_id?: string;
  image_url?: string;
  is_active: boolean;
  sku?: string;
  sort_order: number;
  created_at: string;
}

interface Category {
  object: string;
  category_id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_usd: "",
    category_id: "",
    sku: "",
    image_url: "",
    sort_order: "0",
  });

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/pos/products?limit=200"),
        fetch("/api/pos/categories"),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.data || []);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.data || []);
      }
    } catch {
      console.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price_usd: "",
      category_id: "",
      sku: "",
      image_url: "",
      sort_order: "0",
    });
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price_usd: (product.price_usd / 100).toFixed(2),
      category_id: product.category_id || "",
      sku: product.sku || "",
      image_url: product.image_url || "",
      sort_order: String(product.sort_order),
    });
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.price_usd || parseFloat(formData.price_usd) < 0) {
      toast.error("Valid price is required");
      return;
    }

    setCreating(true);
    try {
      const body: Record<string, any> = {
        name: formData.name.trim(),
        price_usd: Math.round(parseFloat(formData.price_usd) * 100),
      };

      if (formData.description) body.description = formData.description.trim();
      if (formData.category_id) body.category_id = formData.category_id;
      if (formData.sku) body.sku = formData.sku.trim();
      if (formData.image_url) body.image_url = formData.image_url.trim();
      if (formData.sort_order) body.sort_order = parseInt(formData.sort_order);

      const url = editingProduct
        ? `/api/pos/products/${editingProduct.product_id}`
        : "/api/pos/products";

      const res = await fetch(url, {
        method: editingProduct ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to save product");
      }

      toast.success(editingProduct ? "Product updated" : "Product created");
      setShowCreateModal(false);
      setEditingProduct(null);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save product",
      );
    } finally {
      setCreating(false);
    }
  };

  const deactivateProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/pos/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Product deactivated");
        fetchData();
      }
    } catch {
      toast.error("Failed to deactivate product");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getCategoryName = (id?: string) => {
    if (!id) return null;
    const cat = categories.find((c) => c.category_id === id);
    return cat?.name || null;
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
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingProduct(null);
            setShowCreateModal(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-2xl">
                <Package className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="mt-4 mb-1 text-lg font-semibold">
                {searchTerm ? "No products found" : "No products yet"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                {searchTerm
                  ? "Try a different search term"
                  : "Add your first product to start accepting payments at your point of sale."}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => {
                    resetForm();
                    setEditingProduct(null);
                    setShowCreateModal(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Product
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredProducts.map((product) => (
                <div
                  key={product.product_id}
                  className="group hover:bg-accent/50 flex items-center gap-4 px-4 py-3 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Package className="h-5 w-5 text-blue-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {product.name}
                      </span>
                      {product.sku && (
                        <span className="text-muted-foreground text-xs">
                          SKU: {product.sku}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      {getCategoryName(product.category_id) && (
                        <>
                          <span>{getCategoryName(product.category_id)}</span>
                          <span className="text-border">·</span>
                        </>
                      )}
                      {product.description && (
                        <span className="max-w-[200px] truncate">
                          {product.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-20 shrink-0 text-right font-medium">
                    {formatPrice(product.price_usd)}
                  </div>

                  <div className="shrink-0">
                    <Badge
                      variant={product.is_active ? "default" : "secondary"}
                    >
                      {product.is_active ? "Active" : "Inactive"}
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
                        <DropdownMenuItem onClick={() => openEdit(product)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deactivateProduct(product.product_id)}
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
            setEditingProduct(null);
            resetForm();
          }
        }}
      >
        <DialogContent width="sm">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update product details"
                : "Add a new product to your catalog"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Coffee Latte"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (USD) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.price_usd}
                onChange={(e) =>
                  setFormData({ ...formData, price_usd: e.target.value })
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
              <Label>Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(val) =>
                  setFormData({ ...formData, category_id: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                placeholder="Optional SKU or barcode"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
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
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingProduct(null);
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
              {editingProduct ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
