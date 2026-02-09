import { Layout } from "@/components/Layout";
import { useTaxSummary } from "@/hooks/use-tax";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { DashboardCharts } from "@/components/DashboardCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Wallet, TrendingDown, FileText } from "lucide-react";
import { motion } from "framer-motion";

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
      title: "Net Income",
      value: summary.netIncome,
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
      prefix: "$"
    },
    {
      title: "Total Income",
      value: summary.totalIncome,
      icon: Wallet,
      color: "text-green-600",
      bg: "bg-green-100",
      prefix: "+"
    },
    {
      title: "Total Expenses",
      value: summary.totalExpenses,
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-100",
      prefix: "-"
    },
    {
      title: "Est. Tax Owed",
      value: summary.estimatedTax,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-100",
      prefix: "$"
    }
  ];

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your financial snapshot for the current year.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
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
            <Card className="border-border/60 shadow-sm hover:shadow-md transition-all cursor-default group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display tracking-tight">
                  {stat.prefix}{Number(stat.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <DashboardCharts summary={summary} />
      </div>
    </Layout>
  );
}
