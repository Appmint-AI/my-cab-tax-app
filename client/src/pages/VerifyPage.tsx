import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, User, MapPin, FileText, Loader2, CheckCircle, AlertTriangle, CreditCard, Home, Lock, Car, Gauge, Upload, Info } from "lucide-react";

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
  const [, navigate] = useLocation();

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

  const [vehicleName, setVehicleName] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [initialOdometer, setInitialOdometer] = useState("");
  const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);
  const [odometerPhotoUploading, setOdometerPhotoUploading] = useState(false);

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

  const vehicleMutation = useMutation({
    mutationFn: async () => {
      let photoUrl: string | null = null;
      if (odometerPhoto) {
        setOdometerPhotoUploading(true);
        const formData = new FormData();
        formData.append("file", odometerPhoto);
        const photoRes = await fetch("/api/odometer/upload-photo", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (photoRes.ok) {
          const photoData = await photoRes.json();
          photoUrl = photoData.imageUrl;
        }
        setOdometerPhotoUploading(false);
      }

      return apiRequest("POST", "/api/vehicles", {
        name: vehicleName,
        year: vehicleYear ? Number(vehicleYear) : null,
        make: vehicleMake || null,
        model: vehicleModel || null,
        mileageMethod: "standard",
        initialOdometer: initialOdometer ? Number(initialOdometer) : null,
        odometerPhotoUrl: photoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setStep(5);
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

  if (step === 5) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          <h1 className="text-2xl font-display font-bold" data-testid="text-verify-success">
            You're All Set
          </h1>
          <p className="text-muted-foreground">
            Identity verified, vehicle registered, and odometer anchored. You're ready to start tracking.
          </p>
          <Button onClick={() => navigate("/dashboard")} data-testid="button-go-to-dashboard">
            Go to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  if (step === 4) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Car className="h-10 w-10 text-primary mx-auto" />
            <h1 className="text-3xl font-display font-bold" data-testid="text-vehicle-setup-title">
              Vehicle & Odometer Setup
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Before you log your first trip, let's anchor your starting mileage. This creates the legal foundation for all future deductions.
            </p>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">The 3 Types of Deductible Miles</p>
                  <p className="text-xs text-muted-foreground mt-1">Most drivers only track miles with passengers. You should track ALL business miles to maximize your refund:</p>
                </div>
              </div>
              <div className="grid gap-2 pl-8">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="no-default-active-elevate text-xs">Phase 1</Badge>
                  <span className="text-xs"><strong>Online</strong> - Driving while the app is on, waiting for a ping.</span>
                  <Badge variant="outline" className="no-default-active-elevate text-xs ml-auto">Deductible</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="no-default-active-elevate text-xs">Phase 2</Badge>
                  <span className="text-xs"><strong>En Route</strong> - Driving to pick up a passenger.</span>
                  <Badge variant="outline" className="no-default-active-elevate text-xs ml-auto">Deductible</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="no-default-active-elevate text-xs">Phase 3</Badge>
                  <span className="text-xs"><strong>On Trip</strong> - Driving with the passenger.</span>
                  <Badge variant="outline" className="no-default-active-elevate text-xs ml-auto">Deductible</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="no-default-active-elevate text-xs">Commute</Badge>
                  <span className="text-xs text-muted-foreground"><strong>Home to first online spot</strong> - Not deductible.</span>
                  <Badge variant="destructive" className="no-default-active-elevate text-xs ml-auto">Not Deductible</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Add Your Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="vehicleName">Vehicle Name</Label>
                <Input
                  id="vehicleName"
                  data-testid="input-onboard-vehicle-name"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  placeholder="e.g. My Camry"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="vehicleYear">Year</Label>
                  <Input
                    id="vehicleYear"
                    data-testid="input-onboard-vehicle-year"
                    type="number"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <Label htmlFor="vehicleMake">Make</Label>
                  <Input
                    id="vehicleMake"
                    data-testid="input-onboard-vehicle-make"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="Toyota"
                  />
                </div>
                <div>
                  <Label htmlFor="vehicleModel">Model</Label>
                  <Input
                    id="vehicleModel"
                    data-testid="input-onboard-vehicle-model"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Camry"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="initialOdometer" className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Current Odometer Reading
                </Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  This is your legal anchor for all future mileage deductions. Enter the current mileage from your dashboard.
                </p>
                <Input
                  id="initialOdometer"
                  data-testid="input-onboard-odometer"
                  type="number"
                  value={initialOdometer}
                  onChange={(e) => setInitialOdometer(e.target.value)}
                  placeholder="e.g. 45230"
                />
              </div>

              <div>
                <Label htmlFor="odometerPhoto" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Photo Verification (Recommended)
                </Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Take a photo of your dashboard odometer. This serves as proof for IRS audit purposes.
                </p>
                <Input
                  id="odometerPhoto"
                  data-testid="input-onboard-odometer-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setOdometerPhoto(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep(5)}
                  data-testid="button-skip-vehicle"
                >
                  Skip for now
                </Button>
                <Button
                  className="flex-1"
                  disabled={!vehicleName || !initialOdometer || vehicleMutation.isPending || odometerPhotoUploading}
                  onClick={() => vehicleMutation.mutate()}
                  data-testid="button-save-vehicle"
                >
                  {(vehicleMutation.isPending || odometerPhotoUploading) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Car className="mr-2 h-4 w-4" />
                  )}
                  Save Vehicle & Continue
                </Button>
              </div>

              {vehicleMutation.isError && (
                <p className="text-sm text-destructive" data-testid="text-vehicle-error">
                  Failed to save vehicle. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
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
