import { Layout } from "@/components/Layout";
import { useTaxSummary } from "@/hooks/use-tax";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { DashboardCharts } from "@/components/DashboardCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Wallet, TrendingDown, FileText, Car, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading } = useTaxSummary();

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
    </Layout>
  );
}
