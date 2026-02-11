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

export function TermsAcceptanceDialog() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/accept-terms"),
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
            Terms & Conditions
          </DialogTitle>
          <DialogDescription>
            Please review and accept our terms to continue using My Cab Tax USA.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64 pr-4">
          <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
            <p>
              By using My Cab Tax USA, you acknowledge and agree to the following:
            </p>

            <div className="space-y-3">
              <div>
                <p className="font-semibold text-foreground">Terms of Service</p>
                <p>You agree to use the Service responsibly and in accordance with applicable laws. We are not liable for any IRS audits, penalties, or interest resulting from your use of this app. Accuracy of data entry is the sole responsibility of the driver. Disputes are resolved through individual binding arbitration.</p>
              </div>

              <div>
                <p className="font-semibold text-foreground">Privacy Policy (GLBA & CCPA Compliant)</p>
                <p>We collect your name, email, and financial data you enter (income, expenses, miles, fees) to provide our services. We use industry-standard encryption to protect your data. We do not sell your personal financial data to third parties.</p>
              </div>

              <div>
                <p className="font-semibold text-foreground">Tax Disclaimer & Limitation of Liability</p>
                <p>My Cab Tax USA is a bookkeeping tool, NOT a tax advisory service. Consult a qualified CPA or Tax Attorney before filing any returns. Our total liability shall not exceed the amount you paid in the last 12 months, or $100, whichever is less.</p>
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
            I have read and agree to the Terms of Service, Privacy Policy, and Tax Disclaimers.
          </Label>
        </div>

        <DialogFooter>
          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={!agreed || acceptMutation.isPending}
            data-testid="button-accept-terms"
          >
            {acceptMutation.isPending ? "Accepting..." : "Accept & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
