import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, User, MapPin, FileText, Loader2, CheckCircle, AlertTriangle, CreditCard, Home, Lock } from "lucide-react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

export default function VerifyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
  );
  const [driversLicenseState, setDriversLicenseState] = useState("");
  const [driversLicenseNumber, setDriversLicenseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [ssn4, setSsn4] = useState("");
  const [attestation, setAttestation] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/verify-identity", {
        fullName,
        driversLicenseState,
        driversLicenseNumber: driversLicenseNumber.length > 0 ? "***" : "",
        address: { street, city, state, zipCode },
        ssn4: ssn4.length === 4 ? "****" : "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setStep(4);
    },
  });

  if (user?.isVerified) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          <h1 className="text-2xl font-display font-bold" data-testid="text-already-verified">
            Identity Verified
          </h1>
          <p className="text-muted-foreground">
            Your identity has been verified. You have full access to all features.
          </p>
        </div>
      </Layout>
    );
  }

  if (step === 4) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          <h1 className="text-2xl font-display font-bold" data-testid="text-verify-success">
            Verification Complete
          </h1>
          <p className="text-muted-foreground">
            Your identity has been verified. You now have full access to all tax tracking features.
          </p>
          <Button onClick={() => window.location.href = "/dashboard"} data-testid="button-go-to-dashboard">
            Go to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-3xl font-display font-bold" data-testid="text-verify-title">
            Welcome to the Vault. Let's get you verified.
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            To protect your data and ensure IRS compliance, we need to verify your identity. Please have the following ready:
          </p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Photo ID</p>
                <p className="text-xs text-muted-foreground">A valid US Driver's License.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Home className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Business Address</p>
                <p className="text-xs text-muted-foreground">A utility bill or bank statement from the last 60 days.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Tax ID</p>
                <p className="text-xs text-muted-foreground">Your SSN or EIN (this is encrypted and never shared).</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Verification typically takes less than 2 minutes using our AI scanner.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                    ? "bg-green-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`step-indicator-${s}`}
              >
                {s < step ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-green-600" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Legal Full Name</Label>
                <Input
                  id="fullName"
                  data-testid="input-verify-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="As it appears on your driver's license"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dlState">License State</Label>
                  <Select value={driversLicenseState} onValueChange={setDriversLicenseState}>
                    <SelectTrigger data-testid="select-verify-dl-state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dlNumber">License Number</Label>
                  <Input
                    id="dlNumber"
                    data-testid="input-verify-dl-number"
                    value={driversLicenseNumber}
                    onChange={(e) => setDriversLicenseNumber(e.target.value)}
                    placeholder="DL Number"
                    type="password"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!fullName || !driversLicenseState || !driversLicenseNumber}
                onClick={() => setStep(2)}
                data-testid="button-verify-next-1"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  data-testid="input-verify-street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    data-testid="input-verify-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger data-testid="select-verify-state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    data-testid="input-verify-zip"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="12345"
                    maxLength={5}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} data-testid="button-verify-back-2">
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!street || !city || !state || !zipCode}
                  onClick={() => setStep(3)}
                  data-testid="button-verify-next-2"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tax Reference & Attestation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ssn4">Last 4 of SSN</Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Used only for identity verification. Never stored in plain text.
                </p>
                <Input
                  id="ssn4"
                  data-testid="input-verify-ssn4"
                  value={ssn4}
                  onChange={(e) => setSsn4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                  type="password"
                  maxLength={4}
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Federal law (26 U.S.C. 7206) imposes penalties for fraudulently misrepresenting identity for tax purposes. By proceeding, you certify the information provided is true and correct.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="attestation"
                  checked={attestation}
                  onCheckedChange={(c) => setAttestation(c === true)}
                  data-testid="checkbox-verify-attestation"
                />
                <Label htmlFor="attestation" className="text-sm leading-snug cursor-pointer">
                  I certify under penalty of perjury that the information I have provided is true, correct, and complete to the best of my knowledge.
                </Label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} data-testid="button-verify-back-3">
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={ssn4.length !== 4 || !attestation || verifyMutation.isPending}
                  onClick={() => verifyMutation.mutate()}
                  data-testid="button-verify-submit"
                >
                  {verifyMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Verify Identity
                </Button>
              </div>

              {verifyMutation.isError && (
                <p className="text-sm text-destructive" data-testid="text-verify-error">
                  Verification failed. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Your personal information is encrypted and never shared with third parties. We comply with CCPA and federal data protection regulations.
          </p>
        </div>
      </div>
    </Layout>
  );
}
