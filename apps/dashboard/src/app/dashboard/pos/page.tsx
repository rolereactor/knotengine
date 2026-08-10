"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, Package, Tags, Monitor, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PosStats {
  products: number;
  categories: number;
  registers: number;
  activeRegisters: number;
}

export default function PosPage() {
  const [stats, setStats] = useState<PosStats>({
    products: 0,
    categories: 0,
    registers: 0,
    activeRegisters: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [products, categories, registers] = await Promise.all([
          fetch("/api/pos/products?limit=1").then((r) => r.json()),
          fetch("/api/pos/categories").then((r) => r.json()),
          fetch("/api/pos/registers").then((r) => r.json()),
        ]);

        setStats({
          products: products.pagination?.total || products.data?.length || 0,
          categories: categories.data?.length || 0,
          registers: registers.data?.length || 0,
          activeRegisters:
            registers.data?.filter((r: any) => r.is_active).length || 0,
        });
      } catch {
        console.error("Failed to fetch PoS stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const sections = [
    {
      title: "Products",
      description: "Manage your product catalog with prices and categories",
      icon: Package,
      href: "/dashboard/pos/products",
      count: stats.products,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Categories",
      description: "Organize products into categories for easy browsing",
      icon: Tags,
      href: "/dashboard/pos/categories",
      count: stats.categories,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Registers",
      description: "Manage physical or virtual checkout terminals",
      icon: Monitor,
      href: "/dashboard/pos/registers",
      count: stats.registers,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
          <p className="text-muted-foreground">
            Manage products, categories, and registers for in-person crypto
            payments
          </p>
        </div>
        <Link href="/dashboard/pos/checkout">
          <Button size="lg">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Open Checkout
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="group hover:border-primary/50 cursor-pointer transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {section.title}
                </CardTitle>
                <div className={`${section.bg} rounded-lg p-2`}>
                  <section.icon className={`h-4 w-4 ${section.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold tracking-tight">
                      {loading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        section.count
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {section.description}
                    </p>
                  </div>
                  <ArrowRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-sm">
          <p>
            <strong>1.</strong> Create categories to organize your products
          </p>
          <p>
            <strong>2.</strong> Add products with prices (stored in USD cents)
          </p>
          <p>
            <strong>3.</strong> Set up registers for each checkout terminal
          </p>
          <p>
            <strong>4.</strong> Open the checkout to start accepting crypto
            payments
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
