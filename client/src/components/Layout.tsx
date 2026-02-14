import { ReactNode } from "react";
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
  X,
  Settings,
  MapPin,
  ScanLine,
  Shield,
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

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/incomes", label: "Income", icon: Wallet },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/mileage", label: "Mileage", icon: MapPin },
    { href: "/receipts", label: "Receipts", icon: ScanLine },
    { href: "/vehicles", label: "Vehicles", icon: CarFront },
    { href: "/audit-center", label: "Audit Defense", icon: Shield },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg text-primary-foreground">
            <BrandIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight">My Cab Tax</h1>
            <Badge variant="secondary" className="text-[10px] no-default-active-elevate mt-0.5" data-testid="badge-segment-label">
              {segmentConfig.shortLabel}
            </Badge>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`link-nav-${item.label.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-accent-foreground" : "text-muted-foreground")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-2 mb-4">
          <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 bg-background border-r border-border fixed h-full z-30">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-border z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary rounded-md text-primary-foreground">
            <BrandIcon className="h-5 w-5" />
          </div>
          <span className="font-display font-bold text-lg">My Cab Tax</span>
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 w-full max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
