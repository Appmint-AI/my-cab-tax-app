import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { TermsAcceptanceDialog } from "@/components/TermsAcceptanceDialog";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import ExpensesPage from "@/pages/ExpensesPage";
import IncomesPage from "@/pages/IncomesPage";
import SettingsPage from "@/pages/SettingsPage";
import Legal from "@/pages/Legal";
import UpgradePage from "@/pages/UpgradePage";
import SupportPage from "@/pages/SupportPage";
import MileagePage from "@/pages/MileagePage";
import VehiclesPage from "@/pages/VehiclesPage";
import ReceiptsPage from "@/pages/ReceiptsPage";
import ScanPage from "@/pages/ScanPage";
import VerifyPage from "@/pages/VerifyPage";
import AuditCenterPage from "@/pages/AuditCenterPage";
import AdminPage from "@/pages/AdminPage";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function VerifiedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  if (user && !user.isVerified) {
    return <Redirect to="/verify" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/legal" component={Legal} />
      <Route path="/upgrade" component={UpgradePage} />
      <Route path="/support" component={SupportPage} />
      
      <Route path="/verify">
        <ProtectedRoute component={VerifyPage} />
      </Route>

      <Route path="/dashboard">
        <VerifiedRoute component={Dashboard} />
      </Route>
      
      <Route path="/mileage">
        <VerifiedRoute component={MileagePage} />
      </Route>

      <Route path="/vehicles">
        <VerifiedRoute component={VehiclesPage} />
      </Route>

      <Route path="/receipts">
        <VerifiedRoute component={ReceiptsPage} />
      </Route>

      <Route path="/scan">
        <VerifiedRoute component={ScanPage} />
      </Route>

      <Route path="/expenses">
        <VerifiedRoute component={ExpensesPage} />
      </Route>
      
      <Route path="/incomes">
        <VerifiedRoute component={IncomesPage} />
      </Route>

      <Route path="/audit-center">
        <VerifiedRoute component={AuditCenterPage} />
      </Route>

      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>

      <Route path="/admin">
        <ProtectedRoute component={AdminPage} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <TermsAcceptanceDialog />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
