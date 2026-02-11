import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Shield, Trash2, User, FileText, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [dangerStep, setDangerStep] = useState(0);
  const [dangerAcknowledged, setDangerAcknowledged] = useState(false);
  const [dangerConfirmText, setDangerConfirmText] = useState("");

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

  const accountDeleteMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/delete-account", {
        confirmation: dangerConfirmText,
        acknowledged: true,
      }),
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  function resetDangerZone() {
    setDangerStep(0);
    setDangerAcknowledged(false);
    setDangerConfirmText("");
  }

  const confirmationValid =
    dangerConfirmText === user?.email ||
    dangerConfirmText.toUpperCase() === "DELETE";

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

      <Separator className="my-2" />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground/80 leading-relaxed">
            Permanently delete your account and all associated data. This is a destructive action that cannot be reversed after the 30-day cooling-off period.
          </p>

          <Button
            variant="destructive"
            onClick={() => { resetDangerZone(); setDangerStep(1); }}
            data-testid="button-delete-account"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete My Account and Data
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={dangerStep > 0}
        onOpenChange={(open) => { if (!open) resetDangerZone(); }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {dangerStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Are You Sure?
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm">
                      This will <strong className="text-foreground">permanently delete</strong> the following data from your account:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>All mileage logs</li>
                      <li>All expense receipts and records</li>
                      <li>All income and platform fee records</li>
                      <li>All tax calculations and summaries</li>
                      <li>Your terms acceptance and consent history</li>
                    </ul>
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">
                        <strong>IRS Reminder:</strong> The IRS requires you to keep tax records for at least 3 years. Make sure you have exported or saved your records before proceeding.
                      </p>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={resetDangerZone} data-testid="button-danger-cancel-1">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDangerStep(2)}
                  data-testid="button-danger-continue-1"
                >
                  I Understand, Continue
                </Button>
              </DialogFooter>
            </>
          )}

          {dangerStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Acknowledge Deletion Terms
                </DialogTitle>
                <DialogDescription>
                  Please read and acknowledge the following before proceeding.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="danger-acknowledge"
                    checked={dangerAcknowledged}
                    onCheckedChange={(checked) => setDangerAcknowledged(checked === true)}
                    data-testid="checkbox-danger-acknowledge"
                  />
                  <Label htmlFor="danger-acknowledge" className="text-sm leading-snug cursor-pointer">
                    I understand that My Cab Tax USA does not keep backups of my data once deleted, and I am responsible for maintaining my own records for IRS purposes.
                  </Label>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setDangerStep(1)} data-testid="button-danger-back-2">
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDangerStep(3)}
                  disabled={!dangerAcknowledged}
                  data-testid="button-danger-continue-2"
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}

          {dangerStep === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  Final Confirmation
                </DialogTitle>
                <DialogDescription>
                  Type your email address or the word <strong className="text-foreground">DELETE</strong> to confirm.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="danger-confirm-input" className="text-sm">
                    Type <strong>{user?.email}</strong> or <strong>DELETE</strong>
                  </Label>
                  <Input
                    id="danger-confirm-input"
                    value={dangerConfirmText}
                    onChange={(e) => setDangerConfirmText(e.target.value)}
                    placeholder="Type here to confirm..."
                    autoComplete="off"
                    data-testid="input-danger-confirm"
                  />
                </div>
                <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-border">
                  <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your account will be deactivated immediately and you will be logged out. Your data will be retained for a 30-day cooling-off period, after which it will be permanently purged. If you change your mind during this period, contact support to restore your account.
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setDangerStep(2)} data-testid="button-danger-back-3">
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => accountDeleteMutation.mutate()}
                  disabled={!confirmationValid || accountDeleteMutation.isPending}
                  data-testid="button-danger-final-delete"
                >
                  {accountDeleteMutation.isPending ? "Deleting Account..." : "Permanently Delete My Account"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
