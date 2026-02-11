import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useTaxSummary } from "@/hooks/use-tax";
import { useAuth } from "@/hooks/use-auth";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { DashboardCharts } from "@/components/DashboardCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DollarSign, Wallet, TrendingDown, FileText, Car, Calendar, Download, AlertTriangle, Shield, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO, differenceInDays } from "date-fns";
import { Link } from "wouter";
import type { TaxSummary } from "@shared/schema";
import type { User } from "@shared/models/auth";

export default function Dashboard() {
  const { data: summary, isLoading } = useTaxSummary();
  const { user } = useAuth();

  const isFreeUser = !user?.subscriptionStatus || user.subscriptionStatus === "free";

  if (isLoading || !summary) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </Layout>
    );
  }

  const stats = [
    {
      title: "Gross Income",
      value: summary.grossIncome,
      icon: Wallet,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
      prefix: "$"
    },
    {
      title: "Total Deductions",
      value: summary.totalDeductions,
      icon: TrendingDown,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
      prefix: "-$"
    },
    {
      title: "Net Profit",
      value: summary.netProfit,
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
      prefix: "$"
    },
    {
      title: "SE Tax (15.3%)",
      value: summary.selfEmploymentTax,
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      prefix: "$"
    }
  ];

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground">Schedule C summary for the current tax year.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto flex-wrap">
          <IncomeForm />
          <ExpenseForm />
        </div>
      </div>

      {isFreeUser && <FreeRetentionAlert user={user} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display tracking-tight" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.prefix}{Math.abs(Number(stat.value)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mileage Deduction</CardTitle>
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Car className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display tracking-tight" data-testid="text-mileage-deduction">
              ${summary.mileageDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.totalMiles.toLocaleString()} miles at ${summary.mileageRate}/mi (IRS 2026)
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed" data-testid="text-mileage-disclaimer">
              My Cab Tax USA relies on device GPS and user input. We do not guarantee 100% mileage accuracy. Drivers should cross-reference logs with their vehicle's odometer as required by IRS Publication 463.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quarterly Payment</CardTitle>
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display tracking-tight" data-testid="text-quarterly-payment">
              ${summary.estimatedQuarterlyPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated per quarter
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</CardTitle>
            <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {summary.quarterlyDeadlines.map((d, i) => {
                const date = parseISO(d);
                const isPast = date < new Date();
                return (
                  <div key={d} className="flex items-center gap-2">
                    <Badge variant={isPast ? "secondary" : "default"} className="text-xs no-default-active-elevate">
                      Q{i + 1}
                    </Badge>
                    <span className={`text-sm ${isPast ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                      {format(date, "MMM d, yyyy")}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <DashboardCharts summary={summary} />
      </div>

      <ExportSection summary={summary} />
    </Layout>
  );
}

function FreeRetentionAlert({ user }: { user: User | null | undefined }) {
  if (!user) return null;

  const referenceDate = user.lastLoginAt
    ? new Date(user.lastLoginAt)
    : user.createdAt
      ? new Date(user.createdAt)
      : null;

  if (!referenceDate) return null;

  const daysSinceActivity = differenceInDays(new Date(), referenceDate);
  const daysRemaining = Math.max(0, 90 - daysSinceActivity);

  if (daysSinceActivity < 60) {
    return (
      <Card className="border-yellow-500/40 bg-yellow-50/50 dark:bg-yellow-900/10 mb-2" data-testid="banner-free-tier">
        <CardContent className="flex items-start gap-3 py-3 px-4">
          <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Free Tier: Your tax data is stored for 90 days.
            </p>
            <p className="text-xs text-yellow-700/80 dark:text-yellow-400/70 mt-0.5">
              Upgrade to Pro for 7-year IRS-compliant storage with the Tax Vault.
            </p>
          </div>
          <Link href="/upgrade">
            <Button variant="outline" size="sm" className="shrink-0 border-yellow-500/50 text-yellow-700 dark:text-yellow-300" data-testid="button-upgrade-pro">
              Learn More
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const isCritical = daysRemaining <= 10;

  return (
    <Alert
      variant="destructive"
      className={
        isCritical
          ? "border-destructive bg-destructive/10 dark:bg-destructive/20 mb-2"
          : "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600 mb-2 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400 text-yellow-900 dark:text-yellow-200"
      }
      data-testid="alert-retention-countdown"
    >
      {isCritical ? (
        <AlertTriangle className="h-5 w-5" />
      ) : (
        <Clock className="h-5 w-5" />
      )}
      <AlertTitle className="flex items-center gap-2 flex-wrap">
        Free Tier Storage: Your data is scheduled for cleanup in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.
      </AlertTitle>
      <AlertDescription className="mt-1">
        <p className="text-sm">
          {isCritical
            ? "Your tax records, mileage logs, and expense data will be permanently deleted soon. Act now to preserve your records."
            : "Upgrade to Pro for permanent IRS-compliant storage. Pro members get 7-year Tax Vault retention, unlimited receipt photos, and certified audit-ready exports."}
        </p>
        <div className="flex gap-3 mt-3 flex-wrap">
          <Link href="/upgrade">
            <Button
              variant={isCritical ? "default" : "outline"}
              size="sm"
              data-testid="button-upgrade-pro-alert"
            >
              Upgrade to Pro
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function ExportSection({ summary }: { summary: TaxSummary }) {
  const [certified, setCertified] = useState(false);

  function handleExport() {
    const now = new Date();
    const lines = [
      "MY CAB TAX USA - Schedule C Tax Summary",
      `Generated: ${format(now, "MMMM d, yyyy 'at' h:mm a")}`,
      "=".repeat(50),
      "",
      "INCOME",
      `  Gross Income:            $${summary.grossIncome.toFixed(2)}`,
      `  Platform Fees:           -$${summary.totalPlatformFees.toFixed(2)}`,
      "",
      "DEDUCTIONS",
      `  Mileage (${summary.totalMiles.toLocaleString()} mi x $${summary.mileageRate}/mi): -$${summary.mileageDeduction.toFixed(2)}`,
      `  Other Expenses:          -$${summary.totalOtherExpenses.toFixed(2)}`,
      `  Total Deductions:        -$${summary.totalDeductions.toFixed(2)}`,
      "",
      "SUMMARY",
      `  Net Profit:              $${summary.netProfit.toFixed(2)}`,
      `  Self-Employment Tax (15.3%): $${summary.selfEmploymentTax.toFixed(2)}`,
      `  Est. Quarterly Payment:  $${summary.estimatedQuarterlyPayment.toFixed(2)}`,
      "",
      "QUARTERLY DEADLINES",
      ...summary.quarterlyDeadlines.map((d, i) => `  Q${i + 1}: ${format(parseISO(d), "MMMM d, yyyy")}`),
      "",
      ...Object.keys(summary.expensesByCategory).length > 0 ? [
        "EXPENSES BY CATEGORY",
        ...Object.entries(summary.expensesByCategory).map(([cat, val]) => `  ${cat}: $${Number(val).toFixed(2)}`),
        "",
      ] : [],
      ...Object.keys(summary.incomeBySource).length > 0 ? [
        "INCOME BY SOURCE",
        ...Object.entries(summary.incomeBySource).map(([src, val]) => `  ${src}: $${Number(val).toFixed(2)}`),
        "",
      ] : [],
      "=".repeat(50),
      "CERTIFICATION",
      "I certify under penalty of perjury that the information",
      "provided is true and correct to the best of my knowledge.",
      "I acknowledge that My Cab Tax USA is a tool and not a tax professional.",
      "",
      "DISCLAIMER: This is a bookkeeping summary only. It is NOT",
      "a tax return. Consult a qualified CPA or Tax Attorney before",
      "submitting any returns to the IRS.",
      "=".repeat(50),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MyCabTax_Summary_${format(now, "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-8"
    >
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Tax Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed">
              This export is for your personal records only. It is not a tax return. Consult a qualified CPA or Tax Attorney before submitting any returns to the IRS.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="certify-export"
              checked={certified}
              onCheckedChange={(checked) => setCertified(checked === true)}
              data-testid="checkbox-certify-export"
            />
            <Label htmlFor="certify-export" className="text-sm leading-snug cursor-pointer">
              I certify that these records are accurate and I understand My Cab Tax USA is not a licensed tax professional.
            </Label>
          </div>

          <Button
            onClick={handleExport}
            disabled={!certified}
            data-testid="button-export-summary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Summary
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
