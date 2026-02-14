import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, DollarSign, AlertTriangle, Car, Receipt, Shield, Activity } from "lucide-react";

interface AdminMetrics {
  totalUsers: number;
  proUsers: number;
  verifiedUsers: number;
  totalIncomeRecords: number;
  totalExpenseRecords: number;
  totalMileageLogs: number;
  taxesFiled: number;
  auditLogEntries: number;
  activeComplianceAlerts: number;
}

export default function AdminPage() {
  const { data: metrics, isLoading, error } = useQuery<AdminMetrics>({
    queryKey: ["/api/admin/metrics"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="admin-loading">
        <div className="text-muted-foreground">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="admin-error">
        <div className="text-destructive">Failed to load admin metrics</div>
      </div>
    );
  }

  if (!metrics) return null;

  const cards = [
    { title: "Total Users", value: metrics.totalUsers, icon: Users, testId: "metric-total-users" },
    { title: "Pro Subscribers", value: metrics.proUsers, icon: DollarSign, testId: "metric-pro-users" },
    { title: "Verified Users", value: metrics.verifiedUsers, icon: Shield, testId: "metric-verified-users" },
    { title: "Taxes Filed", value: metrics.taxesFiled, icon: FileText, testId: "metric-taxes-filed" },
    { title: "Income Records", value: metrics.totalIncomeRecords, icon: DollarSign, testId: "metric-income-records" },
    { title: "Expense Records", value: metrics.totalExpenseRecords, icon: Receipt, testId: "metric-expense-records" },
    { title: "Mileage Logs", value: metrics.totalMileageLogs, icon: Car, testId: "metric-mileage-logs" },
    { title: "Audit Log Entries", value: metrics.auditLogEntries, icon: Activity, testId: "metric-audit-logs" },
  ];

  return (
    <div className="min-h-screen bg-background p-6" data-testid="admin-dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Business metrics and system health</p>
          </div>
          {metrics.activeComplianceAlerts > 0 && (
            <Badge variant="destructive" data-testid="badge-compliance-alerts">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {metrics.activeComplianceAlerts} Active Alert{metrics.activeComplianceAlerts !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Card key={card.testId} data-testid={card.testId}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card data-testid="card-system-info">
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax Year</span>
                <span className="font-medium">2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IRS Mileage Rate</span>
                <span className="font-medium">$0.725/mile</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SE Tax Rate</span>
                <span className="font-medium">15.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SALT Cap</span>
                <span className="font-medium">$40,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">1099-K Threshold</span>
                <span className="font-medium">$20,000 / 200 tx</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tips Exemption</span>
                <span className="font-medium">OBBBA Sec. 101</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
