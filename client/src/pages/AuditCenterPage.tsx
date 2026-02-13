import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Shield,
  AlertTriangle,
  Upload,
  FileText,
  Download,
  Loader2,
  CheckCircle,
  Lock,
  Crown,
  ArrowRight,
} from "lucide-react";

export default function AuditCenterPage() {
  const { user } = useAuth();
  const { data: subscription } = useSubscription();
  const isPro = subscription?.tier === "pro";

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-audit-center-title">Audit Defense Center</h1>
          <p className="text-muted-foreground">Your protection against IRS inquiries.</p>
        </div>
        {!isPro && (
          <Link href="/upgrade">
            <Button data-testid="button-upgrade-audit">
              <Crown className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Button>
          </Link>
        )}
      </div>

      <CertificateOfProtection isPro={isPro} />

      {isPro ? (
        <>
          <PanicButton />
          <AuditDossierSection />
          <NoticeUploadSection />
        </>
      ) : (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h3 className="text-lg font-semibold mb-2">Pro Feature</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              The Audit Defense Center is available exclusively to Pro subscribers. Upgrade to unlock the Panic Button, IRS Notice Upload Portal, and Automatic Evidence Dossier generation.
            </p>
            <Link href="/upgrade">
              <Button data-testid="button-upgrade-audit-locked">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}

function CertificateOfProtection({ isPro }: { isPro: boolean }) {
  return (
    <Card className="border-border/60 shadow-sm mb-6 overflow-visible">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg" data-testid="text-certificate-title">Certificate of Protection</CardTitle>
            <p className="text-sm text-muted-foreground">The MCTUSA Audit Defense Guarantee</p>
          </div>
          {isPro ? (
            <Badge variant="default" className="no-default-active-elevate" data-testid="badge-audit-active">
              <CheckCircle className="mr-1 h-3 w-3" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="no-default-active-elevate" data-testid="badge-audit-inactive">
              <Lock className="mr-1 h-3 w-3" />
              Pro Only
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium italic text-muted-foreground" data-testid="text-guarantee-tagline">
          "We stand behind your data."
        </p>
        <p className="text-sm text-muted-foreground">
          If the IRS or state tax authorities audit your 2026 return, My Cab Tax USA provides the following professional support at no additional cost to Pro users:
        </p>

        <div className="space-y-3">
          <GuaranteeItem
            number={1}
            title='The "Vault" Evidence Package'
            description="We will generate a certified, time-stamped dossier of every receipt, mileage log, and 1099-K reconciliation stored in your account."
          />
          <GuaranteeItem
            number={2}
            title="Auditor Documentation Support"
            description="Our system will generate the specific Form 4564 (Information Document Request) responses required by the IRS for vehicle and business expenses."
          />
          <GuaranteeItem
            number={3}
            title="Professional Guidance"
            description='You will receive a step-by-step "Audit Response Roadmap" explaining exactly how to present your MCTUSA records to an IRS examiner.'
          />
          <GuaranteeItem
            number={4}
            title="Data Integrity Warranty"
            description="If a calculation error in our software directly causes an IRS penalty, we will reimburse you for the penalty amount (up to $500).*"
          />
        </div>

        <Separator />
        <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-guarantee-disclaimer">
          *MCTUSA does not provide legal representation or "Power of Attorney" in tax court. We provide the evidence and the tools; you provide the truth. The $500 warranty applies only to verified calculation errors in the MCTUSA software, not to incorrect user-entered data or filing decisions.
        </p>
      </CardContent>
    </Card>
  );
}

function GuaranteeItem({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3" data-testid={`card-guarantee-${number}`}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function PanicButton() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <Card className="border-destructive/30 shadow-sm mb-6 overflow-visible">
      <CardContent className="py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold" data-testid="text-panic-title">Received an IRS Letter?</h3>
            <p className="text-sm text-muted-foreground">
              Start here. Upload your notice and we'll help you build your response.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setShowUpload(!showUpload)}
            data-testid="button-panic-start"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Start Here
          </Button>
        </div>
        {showUpload && (
          <div className="mt-6 pt-6 border-t border-border/50">
            <NoticeUploadForm />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NoticeUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/audit-notices/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-notices"] });
      toast({ title: "Notice uploaded", description: "Your IRS notice has been securely stored in the vault." });
      setFile(null);
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const handleUpload = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("noticeType", "irs_letter");
    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="notice-file" className="text-sm font-medium">Upload a photo of your IRS Notice</Label>
        <p className="text-xs text-muted-foreground mb-2">Accepted formats: JPEG, PNG, WebP. Max 10MB.</p>
        <Input
          id="notice-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          data-testid="input-notice-file"
        />
      </div>
      <Button
        onClick={handleUpload}
        disabled={!file || uploadMutation.isPending}
        data-testid="button-upload-notice"
      >
        {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Upload Notice
      </Button>
    </div>
  );
}

function AuditDossierSection() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/audit-dossier/generate", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to generate dossier");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MCTUSA_Audit_Dossier_${new Date().getFullYear()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Dossier generated", description: "Your IRS Audit Evidence PDF has been downloaded." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm mb-6 overflow-visible">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg" data-testid="text-dossier-title">Automatic Evidence Dossier</CardTitle>
            <p className="text-sm text-muted-foreground">Instantly bundle all your records into a single IRS Audit Evidence PDF.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          This PDF includes your complete Schedule C summary, all income and expense records, contemporaneous mileage logs with integrity certificates, receipt inventory, gross-up math logic, and 1099-K reconciliation. Every page is watermarked: "Verified Record - Stored in MCTUSA Immutable Vault."
        </p>
        <Button onClick={handleGenerate} disabled={generating} data-testid="button-generate-dossier">
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Generate Audit Evidence PDF
        </Button>
      </CardContent>
    </Card>
  );
}

function NoticeUploadSection() {
  const { data: notices, isLoading } = useQuery<any[]>({
    queryKey: ["/api/audit-notices"],
    queryFn: async () => {
      const res = await fetch("/api/audit-notices", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-6">
          <Skeleton className="h-20 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!notices || notices.length === 0) return null;

  return (
    <Card className="border-border/60 shadow-sm overflow-visible">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Uploaded IRS Notices ({notices.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {notices.map((notice: any) => (
            <div
              key={notice.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background"
              data-testid={`card-notice-${notice.id}`}
            >
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{notice.originalFilename || "IRS Notice"}</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : "recently"}
                </p>
              </div>
              <Badge variant="secondary" className="no-default-active-elevate text-xs">
                Stored
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
