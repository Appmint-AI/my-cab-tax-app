import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CarFront, ArrowLeft, Shield, Crown, CheckCircle, AlertTriangle, Clock, FileText, Camera, Lock } from "lucide-react";

const freeFeatures = [
  "Active usage data access",
  "90-day inactivity retention",
  "Basic text export",
  "Text data only (no receipts)",
  "User responsible for backups",
];

const proFeatures = [
  { label: "7-Year Tax Vault Storage", desc: "Exceeds the IRS minimum 3-year requirement" },
  { label: "Audit-Ready PDF Exports", desc: "One-click certified reports for the IRS" },
  { label: "Unlimited Receipt Photos", desc: "Every gas station and repair bill, backed up" },
  { label: "Record Integrity Certificate", desc: "Digitally signed proof of data authenticity" },
  { label: "Encrypted Redundant Backups", desc: "Geographically distributed for disaster recovery" },
  { label: "Priority Support", desc: "Legal & privacy inquiries handled first" },
];

export default function UpgradePage() {
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
            Don't Let the IRS Catch You Empty-Handed.
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            The IRS can audit your records up to 3 years back. If you've under-reported, that window jumps to 6 years. 
            On Free Tier, your data is cleared after 90 days of inactivity. Don't risk losing your deductions and receipts when you need them most.
          </p>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Card className="p-6 border-border/60" data-testid="card-free-comparison">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-muted-foreground" />
              <h3 className="font-display font-bold text-xl">Free Tier</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Basic tracking with limited retention.</p>
            <ul className="space-y-3">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 border-primary/40 bg-primary/5 relative" data-testid="card-pro-comparison">
            <Badge className="absolute top-4 right-4 no-default-active-elevate">Recommended</Badge>
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-6 w-6 text-primary" />
              <h3 className="font-display font-bold text-xl text-primary">My Cab Tax Pro</h3>
            </div>
            <p className="text-sm text-foreground/80 mb-4">Audit insurance for serious drivers.</p>
            <ul className="space-y-3">
              {proFeatures.map((feature) => (
                <li key={feature.label} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{feature.label}</span>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="text-center space-y-6">
          <Card className="p-6 sm:p-8 border-primary/30 bg-primary/5 max-w-xl mx-auto" data-testid="card-cta">
            <Crown className="h-8 w-8 text-primary mx-auto mb-3" />
            <h2 className="font-display font-bold text-2xl mb-2">Lock In Your Records</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to My Cab Tax Pro and never worry about losing your tax records again. Your data is secured in the Tax Vault with 7-year guaranteed retention.
            </p>
            <Button size="lg" data-testid="button-lock-in-records">
              <Lock className="h-4 w-4 mr-2" />
              Lock In My Records Now
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Pro pricing will be announced soon. Join the waitlist to be notified.
            </p>
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
