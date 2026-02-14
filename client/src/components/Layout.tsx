import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { getSegmentConfig } from "@/lib/segment-config";
import { 
  LayoutDashboard, 
  Wallet, 
  Receipt, 
  LogOut, 
  CarFront,
  Package,
  Layers,
  Menu,
  Settings,
  MapPin,
  ScanLine,
  Shield,
  Download,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const segmentConfig = getSegmentConfig(user?.userSegment);
  const BrandIcon = user?.userSegment === "hybrid" ? Layers : user?.userSegment === "delivery" ? Package : CarFront;

  useEffect(() => {
    const segment = user?.userSegment || "taxi";
    document.documentElement.setAttribute("data-segment", segment);
    return () => {
      document.documentElement.removeAttribute("data-segment");
    };
  }, [user?.userSegment]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/incomes", label: "Income", icon: Wallet },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/mileage", label: "Mileage", icon: MapPin },
    { href: "/receipts", label: "Receipts", icon: ScanLine },
    { href: "/vehicles", label: "Vehicles", icon: CarFront },
    { href: "/export", label: "Export", icon: Download, desktopOnly: true },
    { href: "/audit-center", label: "Audit Defense", icon: Shield },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-segment-accent rounded-md">
            <BrandIcon className="h-5 w-5 text-segment-accent-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-base leading-tight text-white dark:text-white">My Cab Tax</h1>
            <p className="text-[11px] text-sidebar-foreground/60 mt-0.5" data-testid="badge-segment-label">
              {segmentConfig.shortLabel} Mode
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`link-nav-${item.label.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-white font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  (item as any).desktopOnly && "hidden md:flex"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-sidebar-foreground/50")} />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-segment-accent" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 mb-3">
          <Avatar className="h-8 w-8 border border-sidebar-border">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="ghost"
          className="w-full justify-start gap-2 text-sidebar-foreground/60"
          onClick={() => logout()}
          data-testid="button-sign-out"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:block w-64 fixed h-full z-30">
        <NavContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar backdrop-blur-md border-b border-sidebar-border z-40 px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-segment-accent rounded-md">
            <BrandIcon className="h-4 w-4 text-segment-accent-foreground" />
          </div>
          <span className="font-semibold text-sm text-white">My Cab Tax</span>
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-sidebar-accent">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-sidebar-border bg-sidebar">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 w-full max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
