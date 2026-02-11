import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCreateCheckoutSession, useSubscription } from "@/hooks/use-subscription";
import { CarFront, ArrowLeft, Shield, Crown, CheckCircle, X, AlertTriangle, Clock, FileText, Camera, Lock, Loader2, Zap } from "lucide-react";

const comparisonRows = [
  { feature: "Manual Expense Entry", basic: true, pro: true },
  { feature: "Mileage Tracking", basic: true, pro: true },
  { feature: "Auto-Grossing (25% Rule)", basic: false, pro: true },
  { feature: "1099-K Matcher", basic: false, pro: true },
  { feature: "Data Retention", basicText: "90 Days", proText: "7 Years" },
];

export default function UpgradePage() {
  const checkoutMutation = useCreateCheckoutSession();
  const { data: subscription } = useSubscription();
  const isPro = subscription?.tier === "pro";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border/40 backdrop-blur-sm fixed w-full z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg text-primary-foreground">
              <CarFront className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">My Cab Tax</span>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex-1 w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-3" data-testid="text-upgrade-title">
            {isPro ? "You're a Pro Member" : "Stop Guessing Your 1099-K."}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            {isPro
              ? "You have full access to Auto-Grossing, 1099-K Matching, and 7-year Tax Vault storage."
              : "Uber and Lyft report your \"Gross Fares\" to the IRS, but only pay you the \"Net.\" If these don't match on your tax return, you risk an audit."
            }
          </p>
        </div>

        {!isPro && (
          <Card className="p-5 sm:p-6 mb-8 border-yellow-500/40 bg-yellow-50/50 dark:bg-yellow-900/10" data-testid="card-irs-warning">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-base mb-1 text-yellow-800 dark:text-yellow-300">IRS Recordkeeping Requirement</h2>
                <p className="text-sm leading-relaxed text-yellow-700/90 dark:text-yellow-400/80">
                  The IRS requires self-employed individuals to keep records that support items reported on their tax returns until the statute of limitations expires &mdash; typically 3 years, but up to 6 years if income is underreported by more than 25%. With the Free Tier's 90-day retention, you may not have your records when you need them.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-0 mb-10 overflow-visible" data-testid="card-feature-comparison">
          <div className="grid grid-cols-3 text-sm font-medium border-b border-border/60">
            <div className="p-4">Feature</div>
            <div className="p-4 text-center">Basic (Free)</div>
            <div className="p-4 text-center text-primary">Pro (Paid)</div>
          </div>
          {comparisonRows.map((row) => (
            <div key={row.feature} className="grid grid-cols-3 text-sm border-b border-border/30 last:border-0">
              <div className="p-4 font-medium">{row.feature}</div>
              <div className="p-4 flex items-center justify-center">
                {row.basicText ? (
                  <span className="text-muted-foreground">{row.basicText}</span>
                ) : row.basic ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
              <div className="p-4 flex items-center justify-center">
                {row.proText ? (
                  <span className="font-medium text-primary">{row.proText}</span>
                ) : row.pro ? (
                  <CheckCircle className="h-4 w-4 text-primary" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
            </div>
          ))}
        </Card>

        <div className="text-center space-y-6">
          <Card className="p-6 sm:p-8 border-primary/30 bg-primary/5 max-w-xl mx-auto" data-testid="card-cta">
            <Crown className="h-8 w-8 text-primary mx-auto mb-3" />
            <h2 className="font-display font-bold text-2xl mb-2">
              {isPro ? "Pro Features Unlocked" : "Unlock Pro Today"}
            </h2>
            <p className="text-sm text-muted-foreground mb-1" data-testid="text-pro-pitch">
              {isPro
                ? "Your records are secured in the Tax Vault with 7-year guaranteed retention."
                : "Upgrade to Pro to unlock Automatic 1099-K Matching and 7-year Tax Vault."
              }
            </p>
            <ul className="text-sm text-left max-w-sm mx-auto mb-4 space-y-1.5 mt-3">
              <li className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Automatically Gross-Up:</strong> Match your records to your 1099-K perfectly.</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Auto-Deduct Fees:</strong> Instantly categorize platform commissions.</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>7-Year Vault:</strong> Secure storage as long as the IRS statute of limitations.</span>
              </li>
            </ul>

            {isPro ? (
              <Badge className="no-default-active-elevate">
                <Crown className="h-3 w-3 mr-1" />
                Active Pro Member
              </Badge>
            ) : (
              <Button
                size="lg"
                data-testid="button-upgrade-checkout"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Upgrade to Pro
              </Button>
            )}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Card className="p-4 text-center" data-testid="card-benefit-vault">
              <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-sm mb-1">Tax Vault</h4>
              <p className="text-xs text-muted-foreground">7-year encrypted storage that exceeds IRS requirements</p>
            </Card>
            <Card className="p-4 text-center" data-testid="card-benefit-exports">
              <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-sm mb-1">Audit-Ready Exports</h4>
              <p className="text-xs text-muted-foreground">One-click PDF reports with integrity certificates</p>
            </Card>
            <Card className="p-4 text-center" data-testid="card-benefit-receipts">
              <Camera className="h-6 w-6 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-sm mb-1">Receipt Backup</h4>
              <p className="text-xs text-muted-foreground">Unlimited photo storage for every receipt</p>
            </Card>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground">
            Questions? Visit our{" "}
            <Link href="/legal?tab=subscriptions" className="text-primary underline">Subscription Terms</Link>
            {" "}or{" "}
            <Link href="/support" className="text-primary underline">contact Legal & Privacy Support</Link>.
          </p>
        </div>
      </main>

      <footer className="py-12 border-t border-border/40 mt-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} My Cab Tax USA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
