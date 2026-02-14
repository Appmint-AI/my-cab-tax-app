import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { ReceiptCapture } from "@/components/ReceiptCapture";
import { useReceipts, useDeleteReceipt, type ReceiptWithSignedUrl } from "@/hooks/use-receipts";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ScanLine, Trash2, ImageIcon, Clock, Shield, Camera, X, ZoomIn } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

function ReceiptHoverPreview({ src, children }: { src: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.right + 12, y: rect.top });
    setShow(true);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="fixed z-50 pointer-events-none hidden md:block"
          style={{ left: Math.min(pos.x, window.innerWidth - 320), top: Math.max(pos.y - 40, 10) }}
        >
          <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden w-72">
            <img src={src} alt="Receipt preview" className="w-full max-h-80 object-contain bg-muted" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReceiptsPage() {
  const { data: receiptsList, isLoading } = useReceipts();
  const { data: subscription } = useSubscription();
  const deleteMutation = useDeleteReceipt();
  const isPro = subscription?.tier === "pro";
  const [, setLocation] = useLocation();
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptWithSignedUrl | null>(null);

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
        <>
          {/* Desktop Table View */}
          <Card className="hidden md:block border-border/60 shadow-sm overflow-hidden" data-testid="card-receipts-table">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[80px]">Preview</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>AI Confidence</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead className="hidden lg:table-cell">Expires</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiptsList.map((receipt) => {
                    const imgSrc = getImageSrc(receipt);
                    return (
                      <TableRow key={receipt.id} className="group hover:bg-muted/30" data-testid={`row-receipt-${receipt.id}`}>
                        <TableCell>
                          {imgSrc ? (
                            <ReceiptHoverPreview src={imgSrc}>
                              <div className="relative rounded-md overflow-hidden bg-muted" style={{ width: 48, height: 48 }}>
                                <img
                                  src={imgSrc}
                                  alt="Receipt thumbnail"
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute inset-0 w-full h-full rounded-none bg-transparent opacity-0 hover:opacity-100 hover:bg-black/30"
                                  onClick={() => setPreviewReceipt(receipt)}
                                  data-testid={`button-preview-receipt-${receipt.id}`}
                                >
                                  <ZoomIn className="h-4 w-4 text-white" />
                                </Button>
                              </div>
                            </ReceiptHoverPreview>
                          ) : (
                            <div className="rounded-md bg-muted flex items-center justify-center" style={{ width: 48, height: 48 }}>
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-receipt-merchant-${receipt.id}`}>
                          {receipt.merchantName || receipt.originalFilename || "Receipt"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {receipt.receiptDate || "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono" data-testid={`text-receipt-amount-${receipt.id}`}>
                          {receipt.totalAmount ? `$${Number(receipt.totalAmount).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>
                          {receipt.ocrConfidence && Number(receipt.ocrConfidence) > 0 ? (
                            <Badge variant="outline" className="text-xs no-default-active-elevate">
                              AI {Number(receipt.ocrConfidence).toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={receipt.retentionPolicy === "pro" ? "default" : "secondary"} className="no-default-active-elevate">
                            {receipt.retentionPolicy === "pro" ? "7yr Vault" : "90-day"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                          {receipt.expiresAt ? format(new Date(receipt.expiresAt), "MMM yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="invisible group-hover:visible"
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {receiptsList.map((receipt) => (
              <Card key={receipt.id} data-testid={`card-receipt-${receipt.id}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-4">
                    <div className="relative rounded-md overflow-hidden bg-muted shrink-0" style={{ width: 64, height: 64 }}>
                      {getImageSrc(receipt) ? (
                        <img
                          src={getImageSrc(receipt)}
                          alt="Receipt"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute inset-0 w-full h-full rounded-none bg-transparent"
                        onClick={() => setPreviewReceipt(receipt)}
                        data-testid={`button-preview-receipt-mobile-${receipt.id}`}
                      >
                        <span className="sr-only">Preview receipt</span>
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate" data-testid={`text-receipt-merchant-mobile-${receipt.id}`}>
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
                          <span>${Number(receipt.totalAmount).toFixed(2)}</span>
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
                          data-testid={`button-delete-receipt-mobile-${receipt.id}`}
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
        </>
      )}

      <Dialog open={!!previewReceipt} onOpenChange={(open) => !open && setPreviewReceipt(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden" data-testid="dialog-receipt-preview">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
              onClick={() => setPreviewReceipt(null)}
              data-testid="button-close-receipt-preview"
            >
              <X className="h-4 w-4" />
            </Button>
            {previewReceipt && (
              <div className="flex flex-col">
                <img
                  src={getImageSrc(previewReceipt)}
                  alt="Receipt full preview"
                  className="w-full max-h-[70vh] object-contain bg-muted"
                  data-testid="img-receipt-full-preview"
                />
                <div className="p-4 border-t border-border space-y-2">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-medium" data-testid="text-preview-merchant">
                        {previewReceipt.merchantName || previewReceipt.originalFilename || "Receipt"}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        {previewReceipt.totalAmount && <span>${Number(previewReceipt.totalAmount).toFixed(2)}</span>}
                        {previewReceipt.receiptDate && <span>{previewReceipt.receiptDate}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={previewReceipt.retentionPolicy === "pro" ? "default" : "secondary"}>
                        {previewReceipt.retentionPolicy === "pro" ? "7yr Vault" : "90-day"}
                      </Badge>
                      {previewReceipt.ocrConfidence && Number(previewReceipt.ocrConfidence) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          AI {Number(previewReceipt.ocrConfidence).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
