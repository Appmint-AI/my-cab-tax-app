import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, Scale } from "lucide-react";

const CURRENT_TERMS_VERSION = "1.0";

export function TermsAcceptanceDialog() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/accept-terms", { version: CURRENT_TERMS_VERSION }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const shouldShow = isAuthenticated && user && !user.termsAcceptedAt;

  if (!shouldShow) return null;

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-display" data-testid="text-terms-dialog-title">
            Legal Consent Required
          </DialogTitle>
          <DialogDescription>
            Please review and accept our terms to continue using My Cab Tax USA.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-72 pr-4">
          <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
            <p className="text-xs text-muted-foreground">
              Terms Version {CURRENT_TERMS_VERSION} &mdash; Last Updated: February 2026
            </p>

            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Tax Disclaimer</p>
                <p className="text-xs">
                  My Cab Tax USA is a <strong>bookkeeping tool only</strong>, NOT a tax advisory service. We do not provide tax, legal, or accounting advice. All calculations are estimates based on data you enter. You are solely responsible for the accuracy of your data and tax filings. <strong>Consult a qualified CPA or Tax Attorney before filing any returns with the IRS.</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-semibold text-foreground">Limitation of Liability</p>
                <p>Our total liability shall not exceed the amount you paid in the last 12 months, or $100, whichever is less. We are not liable for any IRS audits, penalties, interest, or tax-related consequences resulting from your use of this app.</p>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-border">
                <Scale className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">Mandatory Arbitration Clause</p>
                  <p className="text-xs">
                    Any disputes arising from these Terms or the Service will be resolved through <strong>individual binding arbitration</strong> in the United States. You waive your right to participate in a class-action lawsuit or class-wide arbitration. This clause survives termination of your account.
                  </p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-foreground">Privacy Policy (GLBA & CCPA Compliant)</p>
                <p>We collect your name, email, and financial data you enter to provide our services. We use industry-standard encryption. We do not sell your personal financial data to third parties. California residents have additional data rights under CCPA.</p>
              </div>
            </div>

            <p className="text-muted-foreground">
              Read the full{" "}
              <Link href="/legal" className="text-primary underline" data-testid="link-full-legal">
                Terms of Service, Privacy Policy, and Tax Disclaimers
              </Link>
              .
            </p>
          </div>
        </ScrollArea>

        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="accept-terms"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            data-testid="checkbox-accept-terms"
          />
          <Label htmlFor="accept-terms" className="text-sm leading-snug cursor-pointer">
            I have read and agree to the Terms of Service (v{CURRENT_TERMS_VERSION}), Privacy Policy, Tax Disclaimers, and Mandatory Arbitration clause.
          </Label>
        </div>

        <DialogFooter>
          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={!agreed || acceptMutation.isPending}
            data-testid="button-accept-terms"
          >
            {acceptMutation.isPending ? "Accepting..." : "I Agree"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
