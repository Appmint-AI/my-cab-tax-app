import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { Shield, Trash2, User, FileText, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/request-data-deletion"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tax/summary"] });
      setDeleteDialogOpen(false);
      toast({
        title: "Data Deleted",
        description: "All your tax records have been permanently erased.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete data. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <div className="space-y-2">
        <h1 className="text-2xl font-display font-bold tracking-tight" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account and privacy preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-lg" data-testid="text-profile-name">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-profile-email">
                {user?.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Legal Consent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-foreground/80">Terms Accepted:</p>
            {user?.termsAcceptedAt ? (
              <Badge variant="secondary" data-testid="badge-terms-status">
                Accepted on {format(new Date(user.termsAcceptedAt), "MMMM d, yyyy")}
              </Badge>
            ) : (
              <Badge variant="outline" data-testid="badge-terms-status">Not yet accepted</Badge>
            )}
          </div>
          {user?.termsVersion && (
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-foreground/80">Version:</p>
              <Badge variant="outline" data-testid="badge-terms-version">v{user.termsVersion}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground/80 leading-relaxed">
            Under the California Consumer Privacy Act (CCPA) and other applicable privacy laws, you have the right to request permanent deletion of your personal data. This action cannot be undone.
          </p>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-request-data-deletion">
                <Trash2 className="h-4 w-4 mr-2" />
                Request Data Deletion
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Permanently Delete All Data?
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      This action will <strong className="text-foreground">permanently erase all of your tax records</strong> to comply with applicable privacy laws, including:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>All income records</li>
                      <li>All expense records</li>
                      <li>Mileage logs and platform fee data</li>
                      <li>Your terms acceptance history</li>
                    </ul>
                    <p className="font-medium text-destructive">
                      This action cannot be undone. Your account will remain active but all financial data will be permanently removed.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-deletion">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteMutation.isPending}
                  data-testid="button-confirm-deletion"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Yes, Delete All My Data"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {user?.dataDeletionRequestedAt && (
            <p className="text-xs text-muted-foreground" data-testid="text-deletion-date">
              Last deletion performed: {format(new Date(user.dataDeletionRequestedAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
