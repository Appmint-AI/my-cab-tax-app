import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useTaxSummary } from "@/hooks/use-tax";
import { useAuth } from "@/hooks/use-auth";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { Form1099K } from "@/components/forms/Form1099K";
import { AutoGrossForm } from "@/components/forms/AutoGrossForm";
import { ReceiptCapture } from "@/components/ReceiptCapture";
import { DashboardCharts } from "@/components/DashboardCharts";
import { useMileageLogs } from "@/hooks/use-mileage-logs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Wallet, TrendingDown, FileText, Car, Calendar, Download, AlertTriangle, Shield, Clock, Loader2, Info, Send, CheckCircle2, XCircle, Lock, Gauge, MapPin, Bell, Radio, X, RefreshCw, ExternalLink, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO, differenceInDays } from "date-fns";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { IRS_MILEAGE_RATE } from "@shared/schema";
import type { TaxSummary, MileageLog } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { getSegmentConfig } from "@/lib/segment-config";

const IRS_1099K_THRESHOLD = 20000;
const IRS_1099K_TRANSACTIONS = 200;

function SmallEarnerGate({ grossIncome }: { grossIncome: number }) {
  const isAboveThreshold = grossIncome >= IRS_1099K_THRESHOLD;

  return (
    <Card className="mt-6 border-blue-200/60 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm" data-testid="card-1099k-gate">
      <CardContent className="flex items-start gap-3 py-3 px-4">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              2026 IRS Update: 1099-K Reporting
            </p>
            {isAboveThreshold ? (
              <Badge variant="destructive" className="text-[10px] no-default-active-elevate" data-testid="badge-1099k-above">
                Threshold Exceeded
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-green-400 text-green-700 dark:text-green-300 no-default-active-elevate" data-testid="badge-1099k-below">
                Below Threshold
              </Badge>
            )}
          </div>
          {isAboveThreshold ? (
            <p className="text-xs text-blue-800/70 dark:text-blue-300/70 mt-1 leading-relaxed">
              Your gross income (${grossIncome.toLocaleString()}) exceeds the 2026 reporting threshold of ${IRS_1099K_THRESHOLD.toLocaleString()}. Platforms must issue a 1099-K when gross payments exceed ${IRS_1099K_THRESHOLD.toLocaleString()} AND exceed {IRS_1099K_TRANSACTIONS} transactions. Report the GROSS amount from Box 1a, even if it differs from your bank deposits. Use "Add 1099-K" to enter your details.
            </p>
          ) : (
            <p className="text-xs text-blue-800/70 dark:text-blue-300/70 mt-1 leading-relaxed">
              Your gross income (${grossIncome.toLocaleString()}) is below the 2026 gross threshold of ${IRS_1099K_THRESHOLD.toLocaleString()}. A 1099-K is required only when BOTH the ${IRS_1099K_THRESHOLD.toLocaleString()} gross AND {IRS_1099K_TRANSACTIONS}+ transaction thresholds are met. You must still report all income on Schedule C regardless of whether a 1099-K is issued.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuarterlyEstimatedTaxCalculator({ summary }: { summary: TaxSummary }) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  
  const annualSETax = summary.selfEmploymentTax;
  const seDeduction = summary.seDeduction;
  const taxableIncome = summary.netProfit - seDeduction - (summary.tipExemption || 0);
  
  const federalTaxBrackets2026 = [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ];
  
  let federalIncomeTax = 0;
  let remaining = Math.max(0, taxableIncome);
  for (const bracket of federalTaxBrackets2026) {
    const taxable = Math.min(remaining, bracket.max - bracket.min);
    if (taxable <= 0) break;
    federalIncomeTax += taxable * bracket.rate;
    remaining -= taxable;
  }
  
  const totalAnnualTax = federalIncomeTax + annualSETax;
  const quarterlyPayment = totalAnnualTax / 4;
  
  const effectiveRate = summary.netProfit > 0 ? (totalAnnualTax / summary.netProfit) * 100 : 0;
  
  const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];
  const deadlines = summary.quarterlyDeadlines;

  return (
    <Card className="mt-6 border-border/60 shadow-sm" data-testid="card-quarterly-calculator">
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2 flex-wrap">
          <Gauge className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Quarterly Estimated Tax Calculator
        </CardTitle>
        <Badge variant="outline" className="text-[10px] no-default-active-elevate" data-testid="badge-effective-rate">
          {effectiveRate.toFixed(1)}% Effective Rate
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-md bg-muted/30">
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className="text-sm font-bold font-display" data-testid="text-calc-net-profit">
                ${Math.max(0, summary.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-md bg-muted/30">
              <p className="text-xs text-muted-foreground">Federal Income Tax</p>
              <p className="text-sm font-bold font-display" data-testid="text-calc-income-tax">
                ${federalIncomeTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-md bg-muted/30">
              <p className="text-xs text-muted-foreground">SE Tax (15.3%)</p>
              <p className="text-sm font-bold font-display" data-testid="text-calc-se-tax">
                ${annualSETax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-md bg-purple-50 dark:bg-purple-950/20">
              <p className="text-xs text-muted-foreground">Total Annual Tax</p>
              <p className="text-sm font-bold font-display text-purple-700 dark:text-purple-300" data-testid="text-calc-total-annual">
                ${totalAnnualTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quarterly Payments (Form 1040-ES)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {deadlines.map((d, i) => {
                const date = parseISO(d);
                const isPast = date < today;
                const isCurrent = i + 1 === currentQuarter;
                return (
                  <div
                    key={d}
                    className={`p-3 rounded-md border ${
                      isCurrent
                        ? "border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20"
                        : isPast
                        ? "border-border/40 bg-muted/20 opacity-60"
                        : "border-border/40"
                    }`}
                    data-testid={`card-quarter-${i + 1}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <Badge
                        variant={isCurrent ? "default" : isPast ? "secondary" : "outline"}
                        className="text-[10px] no-default-active-elevate"
                      >
                        {quarterLabels[i]}
                      </Badge>
                      {isPast && <CheckCircle2 className="h-3 w-3 text-muted-foreground" />}
                      {isCurrent && <Clock className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                    </div>
                    <p className="text-sm font-bold font-display mt-1.5">
                      ${quarterlyPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${isPast ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                      Due {format(date, "MMM d")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Estimates based on 2026 federal tax brackets (single filer) and 15.3% SE tax rate. Does not include state taxes. Consult a CPA for precise calculations. IRS safe harbor: pay 100% of prior year tax or 90% of current year tax to avoid underpayment penalties.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceAlertsBanner() {
  const { data: alerts } = useQuery<any[]>({ queryKey: ["/api/compliance-alerts"] });
  const { data: providerStatus } = useQuery<any>({ queryKey: ["/api/tax-provider/status"] });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/compliance-alerts/${id}/dismiss`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/compliance-alerts"] }),
  });

  const activeAlerts = alerts?.filter((a: any) => !a.isDismissed) || [];
  if (activeAlerts.length === 0 && providerStatus?.activeProvider === "static") {
    return (
      <Alert className="mb-4" data-testid="alert-provider-static">
        <Radio className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2 flex-wrap">
          Tax Rate Source: Static Data
          <Badge variant="secondary" className="text-xs no-default-active-elevate">Offline</Badge>
        </AlertTitle>
        <AlertDescription className="text-xs">
          Your tax rates are sourced from a local file. Connect a live provider (Stripe Tax or Avalara) for real-time rate updates and certified accuracy. The IRS Compliance Sentinel is monitoring for regulatory changes.
        </AlertDescription>
      </Alert>
    );
  }

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4" data-testid="compliance-alerts-panel">
      {activeAlerts.slice(0, 5).map((alert: any) => (
        <Alert
          key={alert.id}
          className={
            alert.severity === "critical" ? "border-red-500/50 bg-red-50 dark:bg-red-950/20" :
            alert.severity === "warning" ? "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20" :
            ""
          }
          data-testid={`alert-compliance-${alert.id}`}
        >
          {alert.alertType === "rate_change" ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          <AlertTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2 flex-wrap">
              {alert.title}
              <Badge
                variant={alert.severity === "critical" ? "destructive" : "secondary"}
                className="text-xs no-default-active-elevate"
              >
                {alert.severity}
              </Badge>
              {alert.alertType === "rate_change" && (
                <Badge variant="outline" className="text-xs no-default-active-elevate">Rate Change</Badge>
              )}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => dismissMutation.mutate(alert.id)}
              data-testid={`button-dismiss-alert-${alert.id}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertTitle>
          <AlertDescription className="text-xs">
            <p>{alert.description}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {alert.sourceUrl && (
                <a
                  href={alert.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline flex items-center gap-1"
                  data-testid={`link-alert-source-${alert.id}`}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Source
                </a>
              )}
              <span className="text-xs text-muted-foreground">
                {alert.source} {alert.createdAt && `- ${format(new Date(alert.createdAt), "MMM d, yyyy")}`}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      ))}
      {activeAlerts.length > 5 && (
        <p className="text-xs text-muted-foreground text-center">
          +{activeAlerts.length - 5} more alerts
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useTaxSummary();
  const { data: mileageData } = useMileageLogs();
  const { user } = useAuth();

  const isFreeUser = !user?.subscriptionStatus || user.subscriptionStatus === "free" || user.subscriptionStatus === "basic";
  const segmentConfig = getSegmentConfig(user?.userSegment);

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
      title: segmentConfig.earningsLabel,
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
      title: "Reserved for Taxes",
      value: summary.selfEmploymentTax,
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      prefix: "$",
      subtitle: "SE Tax (15.3% of 92.35%)"
    }
  ];

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-dashboard-title">{segmentConfig.dashboardHeading}</h1>
          <p className="text-muted-foreground">{segmentConfig.dashboardSubheading}</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto flex-wrap">
          <IncomeForm />
          <AutoGrossForm />
          <Form1099K />
          <ExpenseForm />
          <ReceiptCapture />
        </div>
      </div>

      <ComplianceAlertsBanner />

      {isFreeUser && <FreeRetentionAlert user={user} />}

      <QuarterlyOdometerReminder />

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
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                )}
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

      <SmallEarnerGate grossIncome={summary.grossIncome} />

      <QuarterlyEstimatedTaxCalculator summary={summary} />

      <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <DashboardCharts summary={summary} />
      </div>

      <SmartSummaryMoneySaved summary={summary} />

      <SegmentProTips />

      <ExportSection summary={summary} mileageLogs={mileageData || []} />
      <SubmissionReadinessChecklist />
      <FinalizeSubmissionSection summary={summary} />
    </Layout>
  );
}

function SegmentProTips() {
  const { user } = useAuth();
  const segmentConfig = getSegmentConfig(user?.userSegment);
  const { data: subscription } = useSubscription();
  const isPro = subscription?.tier === "pro";

  const tips = isPro
    ? [...segmentConfig.proTips, ...segmentConfig.vaultTips]
    : segmentConfig.proTips;

  return (
    <Card className="mt-6 border-border/60 shadow-sm" data-testid="card-segment-pro-tips">
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2 flex-wrap">
          <Lightbulb className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          {segmentConfig.shortLabel} Tax Tips
        </CardTitle>
        <Badge variant="secondary" className="text-xs no-default-active-elevate" data-testid="badge-segment-tips-count">
          {tips.length} tips
        </Badge>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0 mt-2" />
              <span className="text-foreground/80">{tip}</span>
            </li>
          ))}
        </ul>
        {isPro && segmentConfig.vaultTips.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Vault tips included with your Pro subscription for 7-year IRS-compliant storage.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SmartSummaryMoneySaved({ summary }: { summary: TaxSummary }) {
  const tipSavings = (summary.tipExemption || 0) * 0.22;
  const mileageSavings = summary.mileageDeduction * 0.22;
  const expenseSavings = summary.totalOtherExpenses * 0.22;
  const seDeductionSavings = summary.seDeduction * 0.22;
  
  const saltExpenses = (summary.expensesByCategory["Property Tax (SALT)"] || 0) + (summary.expensesByCategory["Home Office"] || 0);
  const saltCapped = Math.min(saltExpenses, summary.saltDeductionCap || 40000);
  const saltSavings = saltCapped * 0.22;
  
  const totalSavings = tipSavings + mileageSavings + expenseSavings + seDeductionSavings + saltSavings;
  
  const savingsItems = [
    {
      label: "Mileage Deduction",
      amount: summary.mileageDeduction,
      savings: mileageSavings,
      description: `${summary.totalMiles.toLocaleString()} miles at $${summary.mileageRate}/mi`,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      label: "Tips Exemption (2026)",
      amount: summary.tipExemption || 0,
      savings: tipSavings,
      description: "Federal income tax exempt under OBBBA",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      isNew: true,
    },
    {
      label: "Business Expenses",
      amount: summary.totalOtherExpenses,
      savings: expenseSavings,
      description: "Schedule C deductible expenses",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "SE Tax Deduction",
      amount: summary.seDeduction,
      savings: seDeductionSavings,
      description: "50% of self-employment tax deduction",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  if (saltExpenses > 0) {
    savingsItems.push({
      label: "SALT Deductions (2026)",
      amount: saltCapped,
      savings: saltSavings,
      description: `Property tax & home office (capped at $${(summary.saltDeductionCap || 40000).toLocaleString()})`,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      isNew: true,
    });
  }

  return (
    <Card className="mt-8 border-border/60 shadow-sm" data-testid="card-smart-summary">
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2 flex-wrap">
          <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
          Smart Summary: Money Saved
        </CardTitle>
        <Badge variant="outline" className="text-xs border-green-400 text-green-700 dark:text-green-300 no-default-active-elevate" data-testid="badge-total-savings">
          ${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Saved
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Estimated tax savings from your tracked deductions and 2026 tax law changes (based on 22% marginal rate).
          </p>

          <div className="space-y-2">
            {savingsItems
              .filter(item => item.amount > 0)
              .map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/20 border border-border/30"
                  data-testid={`row-savings-${item.label.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-full ${item.bgColor} shrink-0`}>
                      <DollarSign className={`h-3.5 w-3.5 ${item.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium">{item.label}</p>
                        {(item as any).isNew && (
                          <Badge variant="outline" className="text-[9px] border-green-400 text-green-700 dark:text-green-300 no-default-active-elevate">
                            NEW 2026
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold font-display">
                      ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs font-medium ${item.color}`}>
                      -${item.savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tax
                    </p>
                  </div>
                </div>
              ))}
          </div>

          {savingsItems.filter(item => item.amount > 0).length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Start tracking income, mileage, and expenses to see your estimated tax savings here.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-green-50/50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/40">
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-200">Total Estimated Tax Savings</p>
              <p className="text-xs text-green-800/70 dark:text-green-300/70">Across all tracked deductions and exemptions</p>
            </div>
            <p className="text-xl font-bold font-display text-green-700 dark:text-green-300" data-testid="text-total-savings-amount">
              ${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SubmissionReadinessChecklist() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/submission-readiness"],
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mt-6"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Filing Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!data) return null;

  const checklist: Array<{ label: string; included: boolean; description?: string }> = data.checklist || [];
  const readyCount = checklist.filter((c: any) => c.included).length;
  const totalCount = checklist.length;
  const pct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

  const stateRules: Array<{ code: string; message: string; severity: string }> = data.stateRules || [];
  const tipAdj = data.tipAdjustments || {};
  const stateTax = data.stateTaxEstimate || {};
  const stateInfo = data.stateInfo || {};
  const filingComponents: string[] = data.filingComponents || [];

  const bucketColors: Record<string, string> = {
    None: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    Flat: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700",
    Graduated: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
    Decoupled: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="mt-6"
    >
      <Card data-testid="card-submission-readiness">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Filing Readiness
          </CardTitle>
          <Badge
            variant={pct === 100 ? "default" : "secondary"}
            data-testid="badge-readiness-score"
          >
            {pct}%
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pct} className="h-2" data-testid="progress-readiness" />

          {stateInfo.stateCode && (
            <div className={`flex items-center justify-between p-3 rounded-md border ${bucketColors[stateInfo.taxType] || "bg-muted/50"}`} data-testid="state-bucket-banner">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium" data-testid="text-state-name">{stateInfo.stateName} ({stateInfo.stateCode})</p>
                  <p className="text-xs opacity-80" data-testid="text-bucket-label">{stateInfo.bucketLabel}</p>
                </div>
              </div>
              {stateTax.estimate > 0 && (
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-bold" data-testid="text-state-tax-amount">${Number(stateTax.estimate).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs opacity-70">{stateTax.effectiveRate}% effective</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checklist.map((item: any, i: number) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm"
                data-testid={`readiness-item-${i}`}
              >
                {item.included ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <span className={item.included ? "text-foreground" : "text-muted-foreground"}>
                    {item.label}
                  </span>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filingComponents.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">$50 Filing Bundle Includes:</p>
              <div className="flex flex-wrap gap-1.5">
                {filingComponents.map((comp: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs" data-testid={`filing-component-${i}`}>
                    {comp}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {tipAdj.noTaxOnTipsApplied && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" data-testid="tip-adjustment-info">
              <Info className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-green-800 dark:text-green-300">No Tax on Tips (2026 OBBBA)</p>
                <p className="text-green-700/80 dark:text-green-400/70 mt-0.5">
                  Federal tip income exemption applied.
                  {tipAdj.stateDecoupled && " Your state has decoupled — state taxes still apply on tip income."}
                </p>
              </div>
            </div>
          )}

          {stateInfo.requiresStateAdjustment && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" data-testid="state-adjustment-warning">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-red-800 dark:text-red-300">State Adjustment Required</p>
                <p className="text-red-700/80 dark:text-red-400/70 mt-0.5">
                  {stateInfo.stateName} has decoupled from federal rules. You will be asked about vehicle depreciation and Section 179 deductions during finalization.
                </p>
              </div>
            </div>
          )}

          {stateRules.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t">
              {stateRules.map((rule: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs p-2 rounded-md ${
                    rule.severity === "action"
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      : rule.severity === "warning"
                        ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                        : "bg-muted/50"
                  }`}
                  data-testid={`state-rule-${i}`}
                >
                  {rule.severity === "action" ? (
                    <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  ) : rule.severity === "warning" ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <span>{rule.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
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
              Upgrade to Pro for 7-year IRS-compliant storage with the Tax Vault, plus segment-aware vault tips.
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

function FinalizeSubmissionSection({ summary }: { summary: TaxSummary }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [ack1099k, setAck1099k] = useState(false);
  const [ackFigures, setAckFigures] = useState(false);
  const [ackBookkeeping, setAckBookkeeping] = useState(false);
  const [ackStateVerified, setAckStateVerified] = useState(false);
  const [perjuryAccepted, setPerjuryAccepted] = useState(false);
  const [selfSelectPin, setSelfSelectPin] = useState("");
  const [validating, setValidating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [finalizeResult, setFinalizeResult] = useState<any>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [stateAdjustmentAck, setStateAdjustmentAck] = useState(false);
  const [boughtNewVehicle, setBoughtNewVehicle] = useState(false);
  const [affidavitAccepted, setAffidavitAccepted] = useState(false);

  const { data: readinessData } = useQuery<any>({ queryKey: ["/api/submission-readiness"] });
  const stateInfo = readinessData?.stateInfo || {};
  const requiresStateAdjustment = stateInfo?.requiresStateAdjustment || false;

  const allChecked = ack1099k && ackFigures && ackBookkeeping && ackStateVerified && perjuryAccepted && affidavitAccepted
    && (!requiresStateAdjustment || stateAdjustmentAck);
  const pinValid = /^\d{5}$/.test(selfSelectPin);
  const canSubmit = allChecked && pinValid && validationResult?.valid && !finalizing;
  const taxYear = new Date().getFullYear();

  const preflightChecks = validationResult?.preflightChecks || [];
  const preflightScore = validationResult?.preflightScore || 0;

  function resetModal() {
    setAck1099k(false);
    setAckFigures(false);
    setAckBookkeeping(false);
    setAckStateVerified(false);
    setPerjuryAccepted(false);
    setSelfSelectPin("");
    setValidationResult(null);
    setFinalizeResult(null);
    setFinalizeError(null);
    setStateAdjustmentAck(false);
    setBoughtNewVehicle(false);
    setAffidavitAccepted(false);
  }

  async function handleOpenModal() {
    resetModal();
    setModalOpen(true);
    setValidating(true);
    try {
      const res = await apiRequest("POST", "/api/submissions/validate");
      const data = await res.json();
      setValidationResult(data);
    } catch {
      setValidationResult({ valid: false, errors: [{ message: "Could not validate. Try again." }], warnings: [], preflightScore: 0, preflightChecks: [] });
    } finally {
      setValidating(false);
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    setFinalizeError(null);
    try {
      const res = await apiRequest("POST", "/api/submissions/finalize", {
        taxYear,
        selfSelectPin,
        ack_1099k_verified: ack1099k,
        ack_figures_reviewed: ackFigures,
        ack_bookkeeping_tool: ackBookkeeping,
        ackStateVerified,
        perjury_accepted: perjuryAccepted,
        affidavitAccepted,
        filingStateCode: stateInfo.stateCode || null,
        filingStateBucket: stateInfo.taxType || null,
        stateAdjustmentAck: requiresStateAdjustment ? stateAdjustmentAck : undefined,
        boughtNewVehicle: requiresStateAdjustment ? boughtNewVehicle : undefined,
      });
      if (!res.ok) {
        const errData = await res.json();
        setFinalizeError(errData.message || "Finalization failed.");
        return;
      }
      const data = await res.json();
      setFinalizeResult(data);
    } catch {
      setFinalizeError("An unexpected error occurred during finalization.");
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="mt-4"
    >
      <Card className="border-primary/30 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Finalize & Lock Submission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed">
              Finalizing runs a Pre-Flight Check, requires your e-signature (5-digit PIN), and permanently locks this tax year. Your return will be marked as "Self-Prepared" with MCTUSA as Electronic Return Originator (ERO).
            </p>
          </div>

          <Button
            onClick={handleOpenModal}
            data-testid="button-finalize-submission"
          >
            <Shield className="h-4 w-4 mr-2" />
            Begin Pre-Flight Check
          </Button>

          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="modal-finalize-submission">
              <div className="bg-background border border-border rounded-md w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-lg">
                <div className="p-6 space-y-5">
                  <div className="text-center space-y-2">
                    <Shield className="h-8 w-8 text-primary mx-auto" />
                    <h2 className="text-xl font-bold" data-testid="text-finalize-title">
                      Pre-Flight Check — Tax Year {taxYear}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Self-Prepared Return | MCTUSA as Electronic Return Originator (ERO)
                    </p>
                  </div>

                  {validating && (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm text-muted-foreground">Running pre-flight validation...</span>
                    </div>
                  )}

                  {validationResult && !finalizeResult && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">Pre-Flight Progress</span>
                          <span className="text-sm font-bold" data-testid="text-preflight-score">{preflightScore}%</span>
                        </div>
                        <Progress value={preflightScore} className="h-2" data-testid="progress-preflight" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {preflightChecks.map((check: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-border/60">
                              {check.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                              )}
                              <span className="text-xs" data-testid={`text-preflight-check-${i}`}>{check.label}</span>
                              {check.required && !check.passed && (
                                <Badge variant="destructive" className="ml-auto text-[10px]">Required</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {validationResult.errors?.length > 0 && (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 space-y-1">
                          <p className="text-sm font-medium text-destructive" data-testid="text-validation-errors-title">Blocking Errors (must fix)</p>
                          {validationResult.errors.map((e: any, i: number) => (
                            <p key={i} className="text-xs text-destructive/80" data-testid={`text-validation-error-${i}`}>
                              {e.message}
                            </p>
                          ))}
                        </div>
                      )}
                      {validationResult.warnings?.length > 0 && (
                        <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 space-y-1">
                          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Warnings (review recommended)</p>
                          {validationResult.warnings.map((w: any, i: number) => (
                            <p key={i} className="text-xs text-yellow-600 dark:text-yellow-300" data-testid={`text-validation-warning-${i}`}>
                              {w.message}
                            </p>
                          ))}
                        </div>
                      )}
                      {validationResult.valid && validationResult.errors?.length === 0 && (
                        <div className="p-3 rounded-md bg-green-500/10 border border-green-500/30">
                          <p className="text-sm font-medium text-green-700 dark:text-green-400" data-testid="text-validation-passed">
                            All pre-flight checks passed. Ready to sign and submit.
                          </p>
                        </div>
                      )}

                      {validationResult.valid && (
                        <>
                          <div className="p-4 rounded-md bg-muted/50 border border-border space-y-1">
                            <p className="text-sm font-semibold" data-testid="text-perjury-statement-label">Legal Statement</p>
                            <p className="text-xs text-foreground/80 leading-relaxed italic" data-testid="text-perjury-statement">
                              Under penalties of perjury, I declare that I have examined this return and accompanying schedules and statements, and to the best of my knowledge and belief, they are true, correct, and complete.
                            </p>
                          </div>

                          <div className="space-y-4 pt-2">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="finalize-ack-1099k"
                                checked={ack1099k}
                                onCheckedChange={(c) => setAck1099k(c === true)}
                                data-testid="checkbox-finalize-1099k"
                              />
                              <Label htmlFor="finalize-ack-1099k" className="text-xs leading-snug cursor-pointer">
                                I have verified my 1099-K Gross Income matches my platform records.
                              </Label>
                            </div>
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="finalize-ack-figures"
                                checked={ackFigures}
                                onCheckedChange={(c) => setAckFigures(c === true)}
                                data-testid="checkbox-finalize-figures"
                              />
                              <Label htmlFor="finalize-ack-figures" className="text-xs leading-snug cursor-pointer">
                                I have reviewed all auto-calculated figures and confirm they are accurate.
                              </Label>
                            </div>
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="finalize-ack-bookkeeping"
                                checked={ackBookkeeping}
                                onCheckedChange={(c) => setAckBookkeeping(c === true)}
                                data-testid="checkbox-finalize-bookkeeping"
                              />
                              <Label htmlFor="finalize-ack-bookkeeping" className="text-xs leading-snug cursor-pointer">
                                I understand that MCTUSA is a bookkeeping tool and I am the sole person responsible for this submission.
                              </Label>
                            </div>
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="finalize-ack-state"
                                checked={ackStateVerified}
                                onCheckedChange={(c) => setAckStateVerified(c === true)}
                                data-testid="checkbox-finalize-state"
                              />
                              <Label htmlFor="finalize-ack-state" className="text-xs leading-snug cursor-pointer">
                                {stateInfo.stateCode
                                  ? `I verify that my filing state is ${stateInfo.stateName} (${stateInfo.stateCode}) — ${stateInfo.bucketLabel}.`
                                  : "I verify my filing state jurisdiction is correct."}
                              </Label>
                            </div>
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="finalize-perjury"
                                checked={perjuryAccepted}
                                onCheckedChange={(c) => setPerjuryAccepted(c === true)}
                                data-testid="checkbox-finalize-perjury"
                              />
                              <Label htmlFor="finalize-perjury" className="text-xs leading-snug cursor-pointer">
                                I accept the perjury statement above and understand the legal implications.
                              </Label>
                            </div>
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="finalize-affidavit"
                                checked={affidavitAccepted}
                                onCheckedChange={(c) => setAffidavitAccepted(c === true)}
                                data-testid="checkbox-finalize-affidavit"
                              />
                              <Label htmlFor="finalize-affidavit" className="text-xs leading-snug cursor-pointer">
                                I affirm under penalty of perjury that I am a bona fide resident of {stateInfo.stateName || "my filing state"} as of December 31, {taxYear}, and that the state and local tax information herein is true and correct.
                              </Label>
                            </div>
                          </div>

                          {requiresStateAdjustment && (
                            <div className="space-y-3 p-3 rounded-md border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                <div className="text-xs">
                                  <p className="font-medium text-red-800 dark:text-red-300">{stateInfo.stateName} State Adjustment</p>
                                  <p className="text-red-700/80 dark:text-red-400/70 mt-1">
                                    {stateInfo.stateName} has decoupled from certain federal deduction rules. Please answer the following to ensure your state filing is accurate.
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2 pl-6">
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    id="finalize-bought-vehicle"
                                    checked={boughtNewVehicle}
                                    onCheckedChange={(c) => setBoughtNewVehicle(c === true)}
                                    data-testid="checkbox-bought-vehicle"
                                  />
                                  <Label htmlFor="finalize-bought-vehicle" className="text-xs leading-snug cursor-pointer">
                                    I purchased a new vehicle this tax year and claimed Section 179 or bonus depreciation.
                                  </Label>
                                </div>
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    id="finalize-state-adj-ack"
                                    checked={stateAdjustmentAck}
                                    onCheckedChange={(c) => setStateAdjustmentAck(c === true)}
                                    data-testid="checkbox-state-adjustment-ack"
                                  />
                                  <Label htmlFor="finalize-state-adj-ack" className="text-xs leading-snug cursor-pointer">
                                    I understand that {stateInfo.stateName} may require separate depreciation schedules and my state deductions may differ from federal.
                                  </Label>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2 pt-2">
                            <Label htmlFor="self-select-pin" className="text-sm font-medium flex items-center gap-2">
                              <Lock className="h-4 w-4" />
                              E-Signature: 5-Digit Self-Select PIN
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Enter a 5-digit PIN to electronically sign this submission. This serves as your digital signature.
                            </p>
                            <Input
                              id="self-select-pin"
                              type="password"
                              inputMode="numeric"
                              maxLength={5}
                              placeholder="Enter 5-digit PIN"
                              value={selfSelectPin}
                              onChange={(e) => setSelfSelectPin(e.target.value.replace(/\D/g, "").slice(0, 5))}
                              className="max-w-[200px] font-mono tracking-widest text-center"
                              data-testid="input-self-select-pin"
                            />
                            {selfSelectPin.length > 0 && !pinValid && (
                              <p className="text-xs text-destructive">PIN must be exactly 5 digits</p>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {finalizeError && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
                      <p className="text-xs text-destructive" data-testid="text-finalize-error">{finalizeError}</p>
                    </div>
                  )}

                  {finalizeResult && (
                    <div className="p-4 rounded-md bg-green-500/10 border border-green-500/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <p className="text-sm font-medium text-green-700 dark:text-green-400" data-testid="text-finalize-success">
                          Tax year {finalizeResult.taxYear} has been finalized and locked.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Filing ID: <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded" data-testid="text-filing-id">{finalizeResult.filingId}</code>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submission Hash: <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded" data-testid="text-submission-hash">{finalizeResult.submissionHash}</code>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Preparer Type: <span className="font-medium">Self-Prepared</span> | App Role: <span className="font-medium">ERO</span>
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your records are permanently stored in your 7-year IRS vault. The Filing ID is watermarked on every page of your audit PDF. They cannot be edited or deleted.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => { setModalOpen(false); resetModal(); }}
                      data-testid="button-finalize-cancel"
                    >
                      {finalizeResult ? "Close" : "Cancel"}
                    </Button>
                    {!finalizeResult && (
                      <Button
                        onClick={handleFinalize}
                        disabled={!canSubmit}
                        data-testid="button-finalize-confirm"
                      >
                        {finalizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        {finalizing ? "Signing & Submitting..." : "Submit and Pay"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ExportSection({ summary, mileageLogs }: { summary: TaxSummary; mileageLogs: MileageLog[] }) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [ack3, setAck3] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [submittingToVault, setSubmittingToVault] = useState(false);
  const [vaultSuccess, setVaultSuccess] = useState(false);

  const allAcknowledged = ack1 && ack2 && ack3 && scrolledToBottom;

  function resetDisclaimer() {
    setScrolledToBottom(false);
    setAck1(false);
    setAck2(false);
    setAck3(false);
    setVaultSuccess(false);
  }

  function handleDisclaimerScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 30) {
      setScrolledToBottom(true);
    }
  }

  async function logDisclaimerAcceptance(action: string) {
    try {
      await apiRequest("POST", "/api/audit-log", {
        action,
        metadata: {
          ack_not_tax_advice: true,
          ack_self_prepared: true,
          ack_circular_230: true,
          scrolled_to_bottom: true,
          grossIncome: summary.grossIncome,
          netProfit: summary.netProfit,
        },
      });
    } catch {}
  }

  async function handleSubmitToVault() {
    setSubmittingToVault(true);
    try {
      await logDisclaimerAcceptance("submission.disclaimer_accepted");
      const res = await apiRequest("POST", "/api/submissions/generate", { provider: "vault_pdf" });
      const data = await res.json();
      if (data.success) {
        setVaultSuccess(true);
      }
    } catch {
    } finally {
      setSubmittingToVault(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await logDisclaimerAcceptance("export.disclaimer_accepted");
      const now = new Date();
      const dateStr = format(now, "yyyy-MM-dd");
      const zip = new JSZip();

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;
      const lm = 20;
      const col2 = 130;

      const addLine = (text: string, fontSize = 10, bold = false) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.text(text, lm, y);
        y += fontSize * 0.5 + 2;
      };
      const addRow = (label: string, value: string) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(label, lm + 4, y);
        doc.text(value, col2, y, { align: "left" });
        y += 6;
      };
      const addSep = () => {
        doc.setDrawColor(180);
        doc.line(lm, y, pageWidth - lm, y);
        y += 4;
      };

      doc.setFontSize(8);
      doc.setTextColor(200, 0, 0);
      doc.text("*** SELF-PREPARED / NOT AUDITED ***", pageWidth / 2, 12, { align: "center" });
      doc.setTextColor(0);

      addLine("MY CAB TAX USA", 16, true);
      addLine("Schedule C - Profit or Loss from Business (Summary)", 11, false);
      addLine(`Generated: ${format(now, "MMMM d, yyyy 'at' h:mm a")}`, 8);
      y += 2;
      addSep();

      addLine("PART I - INCOME", 11, true);
      addRow("Line 1  Gross Receipts:", `$${summary.grossIncome.toFixed(2)}`);
      addRow("Line 10  Commissions & Fees:", `-$${summary.totalPlatformFees.toFixed(2)}`);

      if (Object.keys(summary.incomeBySource).length > 0) {
        y += 2;
        addLine("Income by Source:", 9, true);
        Object.entries(summary.incomeBySource).forEach(([src, val]) => {
          addRow(`  ${src}`, `$${Number(val).toFixed(2)}`);
        });
      }
      y += 2;
      addSep();

      addLine("PART II - EXPENSES", 11, true);
      addRow(`Mileage (${summary.totalMiles.toLocaleString()} mi x $${summary.mileageRate}/mi):`, `-$${summary.mileageDeduction.toFixed(2)}`);
      addRow("Other Deductible Expenses:", `-$${summary.totalOtherExpenses.toFixed(2)}`);
      doc.setFont("helvetica", "bold");
      addRow("Total Deductions:", `-$${summary.totalDeductions.toFixed(2)}`);

      if (Object.keys(summary.expensesByCategory).length > 0) {
        y += 2;
        addLine("Expenses by IRS Category:", 9, true);
        Object.entries(summary.expensesByCategory).forEach(([cat, val]) => {
          addRow(`  ${cat}`, `$${Number(val).toFixed(2)}`);
        });
      }
      y += 2;
      addSep();

      addLine("PART III - NET PROFIT & SELF-EMPLOYMENT TAX", 11, true);
      doc.setFont("helvetica", "bold");
      addRow("Line 31  Net Profit (Loss):", `$${summary.netProfit.toFixed(2)}`);
      doc.setFont("helvetica", "normal");
      y += 2;
      addRow("SE Taxable Base (92.35%):", `$${summary.seTaxableBase.toFixed(2)}`);
      addRow("Self-Employment Tax (15.3%):", `$${summary.selfEmploymentTax.toFixed(2)}`);
      addRow("SE Deduction (50% of SE Tax):", `$${summary.seDeduction.toFixed(2)}`);
      y += 2;
      doc.setFont("helvetica", "bold");
      addRow("RESERVED FOR TAXES:", `$${summary.selfEmploymentTax.toFixed(2)}`);
      addRow("Est. Quarterly Payment:", `$${summary.estimatedQuarterlyPayment.toFixed(2)}`);
      doc.setFont("helvetica", "normal");
      y += 2;
      addSep();

      addLine("QUARTERLY ESTIMATED TAX DEADLINES (2026)", 10, true);
      summary.quarterlyDeadlines.forEach((d, i) => {
        addRow(`Q${i + 1}: ${format(parseISO(d), "MMMM d, yyyy")}`, `$${summary.estimatedQuarterlyPayment.toFixed(2)}`);
      });
      y += 4;
      addSep();

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const disclaimer = [
        "CERTIFICATION: I certify under penalty of perjury that the information provided is true and correct to the best of my knowledge.",
        "I acknowledge that My Cab Tax USA is a tool and not a tax professional.",
        "",
        "IRS CIRCULAR 230 DISCLOSURE: To ensure compliance with requirements imposed by the IRS,",
        "we inform you that any tax advice contained in this document was not intended or written to be used,",
        "and cannot be used, for the purpose of (i) avoiding penalties under the Internal Revenue Code",
        "or (ii) promoting, marketing, or recommending to another party any transaction or matter addressed herein.",
        "",
        "DISCLAIMER: This is a bookkeeping summary only. It is NOT a tax return.",
        "Consult a qualified CPA or Tax Attorney before submitting any returns to the IRS.",
        "",
        "This document was generated by My Cab Tax USA, a bookkeeping tool.",
        "It has not been reviewed, verified, or audited by the IRS or any licensed tax professional.",
        "Jurisdiction: State of Delaware.",
      ];
      disclaimer.forEach(line => {
        doc.text(line, lm, y);
        y += 4;
      });

      doc.setFontSize(8);
      doc.setTextColor(200, 0, 0);
      doc.text("*** SELF-PREPARED / NOT AUDITED ***", pageWidth / 2, y + 4, { align: "center" });

      zip.file("Schedule_C_Summary.pdf", doc.output("arraybuffer"));

      const categoryCsvRows = [
        ["Category", "Amount"],
        ...Object.entries(summary.expensesByCategory).map(([cat, val]) => [cat, Number(val).toFixed(2)]),
      ];
      if (Object.keys(summary.incomeBySource).length > 0) {
        categoryCsvRows.push([]);
        categoryCsvRows.push(["Income Source", "Amount"]);
        Object.entries(summary.incomeBySource).forEach(([src, val]) => {
          categoryCsvRows.push([src, Number(val).toFixed(2)]);
        });
      }
      categoryCsvRows.push([]);
      categoryCsvRows.push(["Total Gross Income", summary.grossIncome.toFixed(2)]);
      categoryCsvRows.push(["Total Deductions", summary.totalDeductions.toFixed(2)]);
      categoryCsvRows.push(["Net Profit", summary.netProfit.toFixed(2)]);
      categoryCsvRows.push(["Self-Employment Tax", summary.selfEmploymentTax.toFixed(2)]);
      categoryCsvRows.push(["Est. Quarterly Payment", summary.estimatedQuarterlyPayment.toFixed(2)]);
      zip.file(`Expenses_By_Category_${dateStr}.csv`, categoryCsvRows.map(r => (r as string[]).join(",")).join("\n"));

      const csvEscape = (val: string) => {
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };
      const mileageCsvRows = [
        ["Date", "Business Purpose", "Total Miles", "Start Odometer", "End Odometer", "Deduction"],
        ...mileageLogs
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(log => [
            log.date,
            csvEscape(log.businessPurpose),
            Number(log.totalMiles).toFixed(1),
            log.startOdometer ? Number(log.startOdometer).toString() : "",
            log.endOdometer ? Number(log.endOdometer).toString() : "",
            (Number(log.totalMiles) * IRS_MILEAGE_RATE).toFixed(2),
          ]),
      ];
      if (mileageLogs.length > 0) {
        const totalLogMiles = mileageLogs.reduce((s, l) => s + Number(l.totalMiles), 0);
        mileageCsvRows.push(["TOTAL", "", totalLogMiles.toFixed(1), "", "", (totalLogMiles * IRS_MILEAGE_RATE).toFixed(2)]);
      }
      zip.file("MileageLog.csv", mileageCsvRows.map(r => r.join(",")).join("\n"));

      const receiptsFolder = zip.folder("Receipts");
      try {
        const receiptsRes = await fetch("/api/receipts", { credentials: "include" });
        if (receiptsRes.ok) {
          const receiptsList = await receiptsRes.json();
          const imagePromises = receiptsList.map(async (r: any, idx: number) => {
            try {
              const imageUrl = r.signedImageUrl || r.imageUrl;
              if (!imageUrl) return;
              const imgRes = await fetch(imageUrl);
              if (imgRes.ok) {
                const imgBlob = await imgRes.blob();
                const ext = r.originalFilename?.split(".").pop() || "jpg";
                const safeDate = r.receiptDate || r.createdAt?.split("T")[0] || "unknown";
                const safeMerchant = (r.merchantName || "receipt").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
                const filename = `${safeDate}_${safeMerchant}_${idx + 1}.${ext}`;
                receiptsFolder?.file(filename, imgBlob);
              }
            } catch {}
          });
          await Promise.allSettled(imagePromises);
        }
      } catch {}

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MyCabTax_Export_${dateStr}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
      setDisclaimerOpen(false);
      resetDisclaimer();
    }
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
            Export for IRS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed">
              This export is for your personal records only. It is not a tax return. You must review all figures with a qualified CPA or Tax Attorney before submitting any returns to the IRS.
            </p>
          </div>

          <Button
            onClick={() => { resetDisclaimer(); setDisclaimerOpen(true); }}
            data-testid="button-export-summary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export for IRS
          </Button>

          <AlertDialog open={disclaimerOpen} onOpenChange={(open) => { if (!open) { setDisclaimerOpen(false); resetDisclaimer(); } }}>
            <AlertDialogContent className="sm:max-w-xl" onPointerDownOutside={(e) => e.preventDefault()}>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2" data-testid="text-export-disclaimer-title">
                  <Shield className="h-5 w-5 text-destructive" />
                  Mandatory Legal Disclaimer
                </AlertDialogTitle>
              </AlertDialogHeader>

              <div
                className="max-h-[300px] overflow-y-auto border rounded-md p-4 text-xs leading-relaxed text-foreground/80 space-y-3"
                onScroll={handleDisclaimerScroll}
                data-testid="container-disclaimer-scroll"
              >
                <p className="font-bold text-destructive text-sm">IRS CIRCULAR 230 DISCLOSURE</p>
                <p>
                  To ensure compliance with requirements imposed by the IRS, we inform you that any U.S. federal tax advice contained in this communication (including any attachments) was not intended or written to be used, and cannot be used, for the purpose of (i) avoiding penalties under the Internal Revenue Code or (ii) promoting, marketing, or recommending to another party any transaction or matter addressed herein.
                </p>

                <p className="font-bold text-sm pt-2">NOT TAX ADVICE</p>
                <p>
                  My Cab Tax USA is a bookkeeping tool, NOT a tax advisory service. We do not provide professional tax, legal, or accounting advice. This software is designed for informational and organizational purposes only. The calculations and estimates provided are approximate and should not be relied upon as a substitute for professional tax advice. You should consult with a qualified CPA or Tax Attorney before submitting any returns to the IRS.
                </p>

                <p className="font-bold text-sm pt-2">LIMITATION OF LIABILITY</p>
                <p>
                  The Service is provided "as is" and "as available." To the maximum extent permitted by law, My Cab Tax USA disclaims all warranties, express or implied. In no event shall My Cab Tax USA be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, arising out of or related to your use of the Service.
                </p>

                <p className="font-bold text-sm pt-2">SELF-PREPARED RECORDS</p>
                <p>
                  This export has NOT been reviewed, verified, or audited by the IRS or any licensed tax professional. All figures are self-reported by the user. You are solely responsible for the accuracy of all data entered. Any errors, omissions, or discrepancies in your tax records are your responsibility.
                </p>

                <p className="font-bold text-sm pt-2">DATA RETENTION & JURISDICTION</p>
                <p>
                  This service operates under the jurisdiction of the State of Delaware, USA. All disputes shall be resolved through binding arbitration in accordance with our Terms of Service. Data retention policies apply based on your subscription tier.
                </p>

                <p className="font-bold text-sm pt-2">CERTIFICATION REQUIREMENT</p>
                <p>
                  By proceeding with this export, you certify under penalty of perjury that the information you have entered into My Cab Tax USA is true, correct, and complete to the best of your knowledge and belief. You acknowledge that this certification is being made voluntarily and that you understand the consequences of filing false or misleading information with the IRS.
                </p>
              </div>

              {!scrolledToBottom && (
                <p className="text-xs text-muted-foreground text-center" data-testid="text-scroll-hint">
                  Scroll to the bottom to continue
                </p>
              )}

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="ack-1"
                    checked={ack1}
                    onCheckedChange={(c) => setAck1(c === true)}
                    disabled={!scrolledToBottom}
                    data-testid="checkbox-ack-not-tax-advice"
                  />
                  <Label htmlFor="ack-1" className="text-xs leading-snug cursor-pointer">
                    I understand this is NOT tax advice and My Cab Tax USA is NOT a licensed tax professional.
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="ack-2"
                    checked={ack2}
                    onCheckedChange={(c) => setAck2(c === true)}
                    disabled={!scrolledToBottom}
                    data-testid="checkbox-ack-self-prepared"
                  />
                  <Label htmlFor="ack-2" className="text-xs leading-snug cursor-pointer">
                    I certify under penalty of perjury that all records are accurate and self-prepared.
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="ack-3"
                    checked={ack3}
                    onCheckedChange={(c) => setAck3(c === true)}
                    disabled={!scrolledToBottom}
                    data-testid="checkbox-ack-circular-230"
                  />
                  <Label htmlFor="ack-3" className="text-xs leading-snug cursor-pointer">
                    I have read and acknowledge the IRS Circular 230 Disclosure above.
                  </Label>
                </div>
              </div>

              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel onClick={() => { setDisclaimerOpen(false); resetDisclaimer(); }} data-testid="button-export-cancel">
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="outline"
                  onClick={handleSubmitToVault}
                  disabled={!allAcknowledged || submittingToVault || vaultSuccess}
                  data-testid="button-submit-vault"
                >
                  {submittingToVault ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : vaultSuccess ? <Shield className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  {submittingToVault ? "Submitting..." : vaultSuccess ? "Saved to Vault" : "Confirm & Submit to Vault"}
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={!allAcknowledged || exporting}
                  data-testid="button-export-proceed"
                >
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  {exporting ? "Exporting..." : "I Agree - Download Export"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuarterlyOdometerReminder() {
  const { data: vehicleList, isLoading: vehiclesLoading } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });
  const { data: checkins, isLoading: checkinsLoading } = useQuery<any[]>({
    queryKey: ["/api/odometer-checkins"],
  });

  if (vehiclesLoading || checkinsLoading) return null;
  if (!vehicleList || vehicleList.length === 0) return null;

  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const currentYear = now.getFullYear();

  const hasCheckinThisQuarter = checkins?.some((c: any) => {
    const d = new Date(c.checkinDate);
    return Math.floor(d.getMonth() / 3) + 1 === currentQuarter && d.getFullYear() === currentYear;
  });

  if (hasCheckinThisQuarter) return null;

  return (
    <Alert className="mb-4 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20" data-testid="alert-odometer-reminder">
      <Gauge className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-sm font-medium">Quarterly Odometer Check-In Due</AlertTitle>
      <AlertDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
        <span>Record your current odometer reading to maintain IRS-compliant mileage records (IRC Sec. 274(d)).</span>
        <Link href="/mileage">
          <Button size="sm" variant="outline" data-testid="button-odometer-checkin">
            <Gauge className="mr-1 h-3 w-3" />
            Check In Now
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
