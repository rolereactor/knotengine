"use client";

import * as React from "react";
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Code2,
  Coins,
  Settings,
  LifeBuoy,
  Activity,
  Puzzle,
  Users,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  HomeIcon,
  CircleDollarSignIcon,
  DollarSignIcon,
  TerminalIcon,
  SettingsIcon,
  MessageCircleIcon,
  ActivityIcon,
  BlocksIcon,
  UsersIcon,
  ZapIcon,
  HandCoinsIcon,
} from "lucide-animated";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { MerchantSwitcher } from "./merchant-switcher";
import { usePathname } from "next/navigation";
import packageJson from "../../package.json";

const animatedIconsMap: Record<string, React.ElementType> = {
  Dashboard: HomeIcon,
  Payments: CircleDollarSignIcon,
  "Activity Log": ActivityIcon,
  Balances: DollarSignIcon,
  Billing: HandCoinsIcon,
  Staking: ZapIcon,
  Ecosystem: BlocksIcon,
  "Affiliate Program": UsersIcon,
  Developers: TerminalIcon,
  Settings: SettingsIcon,
  "Help & Support": MessageCircleIcon,
};

const navGroups = [
  {
    label: "Core",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
      { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
      { icon: CreditCard, label: "Payments", href: "/dashboard/payments" },
      { icon: Activity, label: "Activity Log", href: "/dashboard/activity" },
      { icon: Wallet, label: "Balances", href: "/dashboard/balances" },
      { icon: Coins, label: "Billing", href: "/dashboard/billing" },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        icon: Zap,
        label: "Staking",
        href: "/dashboard/staking",
        disabled: true,
      },
      {
        icon: Users,
        label: "Affiliate Program",
        href: "/dashboard/affiliates",
      },
      {
        icon: Puzzle,
        label: "Ecosystem",
        href: "/dashboard/ecosystem",
        disabled: true,
      },
    ],
  },
  {
    label: "Developer",
    items: [
      { icon: Code2, label: "Developers", href: "/dashboard/developers" },
    ],
  },
  {
    label: "Management",
    items: [
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
      { icon: LifeBuoy, label: "Help & Support", href: "/dashboard/support" },
    ],
  },
];

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  disabled?: boolean;
};

function SidebarNavItem({ item, active }: { item: NavItem; active: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iconRef = React.useRef<any>(null);
  const AnimatedIcon = animatedIconsMap[item.label];
  const Icon = AnimatedIcon || item.icon;

  if (item.disabled) {
    return (
      <SidebarMenuItem className="group">
        <SidebarMenuButton
          isActive={false}
          tooltip={`${item.label} (Coming Soon)`}
          className="h-9 cursor-not-allowed font-medium opacity-40 transition-none select-none"
        >
          {AnimatedIcon ? (
            <Icon
              size={16}
              className="flex size-4 shrink-0 items-center justify-center"
            />
          ) : (
            <Icon className="size-4 shrink-0" />
          )}
          <span>{item.label}</span>
          <div className="bg-primary/15 text-primary ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-black tracking-widest uppercase group-data-[collapsible=icon]:hidden">
            Soon
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem className="group">
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className="h-9 font-medium transition-all duration-150 ease-in-out"
        onMouseEnter={() => iconRef.current?.startAnimation?.()}
        onMouseLeave={() => iconRef.current?.stopAnimation?.()}
      >
        <Link href={item.href} prefetch={false}>
          {AnimatedIcon ? (
            <Icon
              ref={iconRef}
              size={16}
              className="flex size-4 shrink-0 items-center justify-center"
            />
          ) : (
            <Icon className="size-4 shrink-0" />
          )}
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0!">
      <SidebarHeader className="border-border/50 flex h-(--header-height) flex-col justify-center border-b px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <MerchantSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="mt-4 overflow-hidden px-2 pb-4 group-data-[collapsible=icon]:px-0">
        <ScrollArea className="h-full pb-4">
          <div className="space-y-4">
            {navGroups.map((group) => (
              <SidebarGroup key={group.label} className="py-0">
                <SidebarGroupLabel className="text-muted-foreground/30 mb-2 truncate px-4 text-[10px] font-bold tracking-wider uppercase group-data-[collapsible=icon]:hidden">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarNavItem
                        key={item.href}
                        item={item}
                        active={isActive(item.href)}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-border/50 border-t p-3">
        <div className="text-muted-foreground/15 mt-1 truncate text-center text-[10px] font-bold tracking-widest uppercase group-data-[collapsible=icon]:hidden">
          Build v{packageJson.version}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
