import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CarFront, Calculator, TrendingUp, ShieldCheck } from "lucide-react";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Redirect to="/dashboard" />;

  const login = () => window.location.href = "/api/login";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border/40 backdrop-blur-sm fixed w-full z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg text-primary-foreground">
              <CarFront className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">My Cab Tax</span>
          </div>
          <Button onClick={login} variant="outline" data-testid="button-login-nav">
            Log In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary-foreground font-medium text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          Built specifically for drivers
        </div>
        
        <h1 className="font-display font-bold text-4xl sm:text-6xl md:text-7xl tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
          Tax Season Made <br />
          <span className="text-primary relative inline-block">
             Simple
             <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/30 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
               <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
             </svg>
          </span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          Track your rideshare income, deduct gas and maintenance expenses, and estimate your taxes in real-time. Never overpay again.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          <Button size="lg" onClick={login} data-testid="button-login-hero">
            Start Tracking Free
          </Button>
        </div>
        
        {/* Abstract Hero Visual */}
        <div className="mt-20 relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 h-20 bottom-0"></div>
          {/* Using a placeholder for a UI screenshot or dashboard preview */}
          <div className="bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden max-w-4xl mx-auto aspect-video flex items-center justify-center bg-muted/30">
             <div className="grid grid-cols-2 md:grid-cols-3 gap-8 p-12 opacity-80">
                <div className="bg-background p-6 rounded-lg shadow-sm border border-border/50 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <TrendingUp />
                  </div>
                  <div className="h-2 w-20 bg-muted rounded"></div>
                  <div className="h-2 w-12 bg-muted rounded"></div>
                </div>
                <div className="bg-background p-6 rounded-lg shadow-sm border border-border/50 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Calculator />
                  </div>
                  <div className="h-2 w-20 bg-muted rounded"></div>
                  <div className="h-2 w-12 bg-muted rounded"></div>
                </div>
                <div className="bg-background p-6 rounded-lg shadow-sm border border-border/50 flex flex-col items-center gap-4 hidden md:flex">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                    <ShieldCheck />
                  </div>
                  <div className="h-2 w-20 bg-muted rounded"></div>
                  <div className="h-2 w-12 bg-muted rounded"></div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-md border border-border/50">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-6">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Real-time Tax Estimates</h3>
              <p className="text-muted-foreground leading-relaxed">
                Know exactly what you owe as you earn. No more surprises at the end of the year.
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-md border border-border/50">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Expense Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">
                Log gas, car washes, and maintenance instantly. Every deduction counts.
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-md border border-border/50">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Secure with MFA</h3>
              <p className="text-muted-foreground leading-relaxed">
                Protected by Auth0 with multi-factor authentication and biometric login. Your financial data stays safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40 mt-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-3 text-muted-foreground text-sm">
          <Link href="/legal" className="underline hover-elevate px-2 py-1 rounded-md" data-testid="link-legal-footer">
            Legal &mdash; Terms, Privacy & Tax Disclaimers
          </Link>
          <p>&copy; {new Date().getFullYear()} My Cab Tax USA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
