import { Layout } from "@/components/Layout";
import { ReceiptCapture } from "@/components/ReceiptCapture";
import { useReceipts, useDeleteReceipt, type ReceiptWithSignedUrl } from "@/hooks/use-receipts";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ScanLine, Trash2, ImageIcon, Clock, Shield, Camera } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function ReceiptsPage() {
  const { data: receiptsList, isLoading } = useReceipts();
  const { data: subscription } = useSubscription();
  const deleteMutation = useDeleteReceipt();
  const isPro = subscription?.tier === "pro";
  const [, setLocation] = useLocation();

  const getImageSrc = (receipt: ReceiptWithSignedUrl) => {
    return receipt.signedImageUrl || receipt.imageUrl;
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-receipts-title">Receipts</h1>
          <p className="text-muted-foreground">
            {isPro ? "AI-powered receipt scanning with 7-year Tax Vault storage." : "Upload and manage your expense receipts."}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setLocation("/scan")} data-testid="button-open-scanner">
            <Camera className="mr-2 h-4 w-4" />
            {isPro ? "AI Scan" : "Scan Receipt"}
          </Button>
          <ReceiptCapture />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <ImageIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-receipt-count">{receiptsList?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Receipts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              {isPro ? <Shield className="h-4 w-4 text-primary" /> : <Clock className="h-4 w-4 text-primary" />}
            </div>
            <div>
              <p className="text-sm font-semibold" data-testid="text-retention-policy">
                {isPro ? "7-Year Vault" : "90-Day Retention"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPro ? "IRS statute of limitations covered" : "Upgrade to Pro for long-term storage"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : !receiptsList || receiptsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <ScanLine className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium" data-testid="text-no-receipts">No receipts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isPro
                  ? "Use the AI Receipt Scanner to capture and auto-read your receipts."
                  : "Upload your receipt photos to keep them organized."}
              </p>
            </div>
            <Button onClick={() => setLocation("/scan")} data-testid="button-first-receipt">
              <ScanLine className="mr-2 h-4 w-4" />
              {isPro ? "Scan Your First Receipt" : "Upload Your First Receipt"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receiptsList.map((receipt) => (
            <Card key={receipt.id} data-testid={`card-receipt-${receipt.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {getImageSrc(receipt) ? (
                      <img
                        src={getImageSrc(receipt)}
                        alt="Receipt"
                        className="h-full w-full object-cover"
                        data-testid={`img-receipt-thumb-${receipt.id}`}
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate" data-testid={`text-receipt-merchant-${receipt.id}`}>
                        {receipt.merchantName || receipt.originalFilename || "Receipt"}
                      </p>
                      <Badge variant={receipt.retentionPolicy === "pro" ? "default" : "secondary"}>
                        {receipt.retentionPolicy === "pro" ? "7yr Vault" : "90-day"}
                      </Badge>
                      {receipt.ocrConfidence && Number(receipt.ocrConfidence) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          AI {Number(receipt.ocrConfidence).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      {receipt.totalAmount && (
                        <span data-testid={`text-receipt-amount-${receipt.id}`}>
                          ${Number(receipt.totalAmount).toFixed(2)}
                        </span>
                      )}
                      {receipt.receiptDate && (
                        <span>{receipt.receiptDate}</span>
                      )}
                      {receipt.expiresAt && (
                        <span className="text-xs">
                          Expires {format(new Date(receipt.expiresAt), "MMM yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-delete-receipt-${receipt.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove this receipt image and its data from the vault. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(receipt.id)}
                          data-testid={`button-confirm-delete-receipt-${receipt.id}`}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
