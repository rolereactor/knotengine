"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  QrCode,
  CheckCircle2,
  Clock,
  X,
  ArrowLeft,
  Package,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  product_id: string;
  name: string;
  description?: string;
  price_usd: number;
  category_id?: string;
  image_url?: string;
  sku?: string;
}

interface Category {
  category_id: string;
  name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface InvoiceResult {
  invoice_id: string;
  amount_usd: number;
  crypto_amount: number;
  crypto_currency: string;
  checkout_url: string;
  status: string;
  expires_at: string;
}

export default function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceResult | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    | "pending"
    | "mempool_detected"
    | "confirming"
    | "confirmed"
    | "expired"
    | "failed"
  >("pending");
  const [timeLeft, setTimeLeft] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/pos/products?limit=500&active=true"),
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
      console.error("Failed to fetch PoS data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.product_id === product.product_id,
      );
      if (existing) {
        return prev.map((item) =>
          item.product.product_id === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.product_id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) =>
      prev.filter((item) => item.product.product_id !== productId),
    );
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price_usd * item.quantity,
    0,
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const startPaymentPolling = useCallback((invoiceId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        if (res.ok) {
          const data = await res.json();
          setPaymentStatus(data.status);

          if (
            data.status === "confirmed" ||
            data.status === "expired" ||
            data.status === "failed"
          ) {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch {
        // Polling error, will retry
      }
    }, 3000);
  }, []);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            product_id: item.product.product_id,
            quantity: item.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to create invoice");
      }

      const data = await res.json();
      setInvoice(data);
      setPaymentStatus("pending");
      setShowPayment(true);
      setShowCart(false);

      // Start countdown
      const expiresAt = new Date(data.expires_at).getTime();
      const updateTimer = () => {
        const remaining = Math.max(
          0,
          Math.floor((expiresAt - Date.now()) / 1000),
        );
        setTimeLeft(remaining);
        if (remaining <= 0 && timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      // Start polling for payment status
      startPaymentPolling(data.invoice_id);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create invoice",
      );
    } finally {
      setProcessing(false);
    }
  };

  const closePayment = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setShowPayment(false);
    setInvoice(null);
    setPaymentStatus("pending");
    setCart([]);
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      label: "Awaiting Payment",
    },
    mempool_detected: {
      icon: Wifi,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      label: "Transaction Detected",
    },
    confirming: {
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      label: "Confirming...",
    },
    confirmed: {
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      label: "Payment Confirmed!",
    },
    expired: {
      icon: X,
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: "Invoice Expired",
    },
    failed: {
      icon: X,
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: "Payment Failed",
    },
  };

  const currentStatus = statusConfig[paymentStatus];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-2rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pos">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Checkout</h1>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setShowCart(true)}
          className="relative"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Cart
          {cartCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
              {cartCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Search and Category Filter */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search products..."
            className="h-11 pl-9 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-11 w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.category_id} value={cat.category_id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="mb-3 h-20 w-full rounded" />
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="text-muted-foreground h-12 w-12" />
            <h3 className="mt-4 mb-1 text-lg font-semibold">
              {searchTerm ? "No products found" : "No products available"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {searchTerm
                ? "Try a different search term"
                : "Add products in the dashboard to start selling."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const inCart = cart.find(
                (item) => item.product.product_id === product.product_id,
              );
              return (
                <Card
                  key={product.product_id}
                  className="hover:ring-primary/50 cursor-pointer transition-all hover:ring-2"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4">
                    <div className="bg-muted mb-3 flex h-20 items-center justify-center rounded-lg">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <Package className="text-muted-foreground h-8 w-8" />
                      )}
                    </div>
                    <div className="truncate text-sm font-medium">
                      {product.name}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-lg font-bold">
                        {formatPrice(product.price_usd)}
                      </span>
                      {inCart && (
                        <Badge variant="secondary" className="text-xs">
                          x{inCart.quantity}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Cart ({cartCount} items)</span>
              <span className="text-lg font-bold">
                {formatPrice(cartTotal)}
              </span>
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <ShoppingCart className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <>
              <div className="max-h-[50vh] space-y-3 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.product.product_id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {item.product.name}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatPrice(item.product.price_usd)} each
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.product.product_id, -1);
                        }}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.product.product_id, 1);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="w-16 text-right text-sm font-medium">
                      {formatPrice(item.product.price_usd * item.quantity)}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.product.product_id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-border border-t pt-4">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={processing}
                >
                  {processing ? (
                    <div className="border-primary-foreground mr-2 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                  ) : (
                    <QrCode className="mr-2 h-5 w-5" />
                  )}
                  {processing ? "Creating Invoice..." : "Generate QR Code"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog
        open={showPayment}
        onOpenChange={(open) => {
          if (!open) closePayment();
        }}
      >
        <DialogContent className="max-w-sm">
          {invoice && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">
                  {paymentStatus === "confirmed"
                    ? "Payment Received!"
                    : paymentStatus === "expired" || paymentStatus === "failed"
                      ? "Payment Failed"
                      : "Scan to Pay"}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col items-center gap-4 py-4">
                {/* Status indicator */}
                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-2 ${currentStatus.bg}`}
                >
                  <StatusIcon className={`h-4 w-4 ${currentStatus.color}`} />
                  <span
                    className={`text-sm font-medium ${currentStatus.color}`}
                  >
                    {currentStatus.label}
                  </span>
                </div>

                {/* QR Code area */}
                {paymentStatus === "pending" ||
                paymentStatus === "mempool_detected" ||
                paymentStatus === "confirming" ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-xl bg-white p-4">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invoice.checkout_url)}`}
                        alt="Payment QR Code"
                        className="h-48 w-48"
                      />
                    </div>
                    <p className="text-muted-foreground text-center text-xs">
                      Or{" "}
                      <a
                        href={invoice.checkout_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        open checkout page
                      </a>
                    </p>
                  </div>
                ) : paymentStatus === "confirmed" ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Thank you for your payment!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
                      <X className="h-10 w-10 text-red-500" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {paymentStatus === "expired"
                        ? "This invoice has expired"
                        : "Payment could not be processed"}
                    </p>
                  </div>
                )}

                {/* Invoice details */}
                <div className="w-full space-y-2 rounded-lg border p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">
                      {formatPrice(invoice.amount_usd)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Crypto</span>
                    <span className="font-medium">
                      {invoice.crypto_amount.toFixed(8)}{" "}
                      {invoice.crypto_currency}
                    </span>
                  </div>
                  {timeLeft > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires in</span>
                      <span
                        className={`font-mono font-medium ${
                          timeLeft < 60 ? "text-red-500" : ""
                        }`}
                      >
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {(paymentStatus === "confirmed" ||
                  paymentStatus === "expired" ||
                  paymentStatus === "failed") && (
                  <Button className="w-full" onClick={closePayment}>
                    {paymentStatus === "confirmed" ? "New Sale" : "Try Again"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
