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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/legal" component={Legal} />
      <Route path="/upgrade" component={UpgradePage} />
      <Route path="/support" component={SupportPage} />
      
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/expenses">
        <ProtectedRoute component={ExpensesPage} />
      </Route>
      
      <Route path="/incomes">
        <ProtectedRoute component={IncomesPage} />
      </Route>

      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
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
