import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUploadReceipt } from "@/hooks/use-receipts";
import { useSubscription, useCreateCheckoutSession } from "@/hooks/use-subscription";
import { Loader2, Camera, Upload, ScanLine, Lock, Crown, ImageIcon, AlertTriangle, Check } from "lucide-react";

interface OcrResult {
  merchantName: string;
  date: string;
  totalAmount: number | null;
  confidence: number;
  rawText: string;
}

interface ReceiptCaptureProps {
  onOcrResult?: (result: OcrResult) => void;
  trigger?: React.ReactNode;
}

const MIN_FILE_SIZE = 50 * 1024;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_DIMENSION = 400;

function checkImageQuality(file: File): Promise<{ valid: boolean; reason?: string }> {
  return new Promise((resolve) => {
    if (file.size < MIN_FILE_SIZE) {
      resolve({ valid: false, reason: "Image file is too small. Please use a higher quality photo for IRS standards." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      resolve({ valid: false, reason: "Image file is too large (max 10MB). Please resize the photo." });
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
        resolve({
          valid: false,
          reason: `Image too blurry for IRS standards. Minimum resolution is ${MIN_DIMENSION}x${MIN_DIMENSION}px. Please retake the photo in better light to ensure your deduction is valid.`,
        });
      } else {
        resolve({ valid: true });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, reason: "Could not read the image file. Please try a different photo." });
    };
    img.src = url;
  });
}

function extractReceiptData(text: string): OcrResult {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  let merchantName = "";
  if (lines.length > 0) {
    for (const line of lines.slice(0, 5)) {
      const cleaned = line.replace(/[^a-zA-Z0-9\s&'-]/g, "").trim();
      if (cleaned.length > 2 && !/^\d+$/.test(cleaned)) {
        merchantName = cleaned;
        break;
      }
    }
  }

  let date = "";
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2}),?\s*(\d{2,4})/i,
  ];
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          const parsed = new Date(match[0]);
          if (!isNaN(parsed.getTime())) {
            date = parsed.toISOString().split("T")[0];
            break;
          }
        } catch {}
        if (!date) {
          date = match[0];
        }
        break;
      }
    }
    if (date) break;
  }

  let totalAmount: number | null = null;
  const totalPatterns = [
    /total[:\s]*\$?\s*(\d+[,.]?\d*)/i,
    /amount[:\s]*\$?\s*(\d+[,.]?\d*)/i,
    /due[:\s]*\$?\s*(\d+[,.]?\d*)/i,
    /balance[:\s]*\$?\s*(\d+[,.]?\d*)/i,
  ];

  for (const line of [...lines].reverse()) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        totalAmount = parseFloat(match[1].replace(",", ""));
        break;
      }
    }
    if (totalAmount !== null) break;
  }

  if (totalAmount === null) {
    const dollarAmounts: number[] = [];
    for (const line of lines) {
      const matches = line.match(/\$\s*(\d+[,.]?\d{0,2})/g);
      if (matches) {
        for (const m of matches) {
          const val = parseFloat(m.replace(/[$,\s]/g, ""));
          if (!isNaN(val) && val > 0) dollarAmounts.push(val);
        }
      }
    }
    if (dollarAmounts.length > 0) {
      totalAmount = Math.max(...dollarAmounts);
    }
  }

  return {
    merchantName,
    date,
    totalAmount,
    confidence: merchantName && totalAmount ? 70 : merchantName || totalAmount ? 40 : 10,
    rawText: text,
  };
}

export function ReceiptCapture({ onOcrResult, trigger }: ReceiptCaptureProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [qualityError, setQualityError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: subscription } = useSubscription();
  const checkoutMutation = useCreateCheckoutSession();
  const uploadMutation = useUploadReceipt();
  const isPro = subscription?.tier === "pro";

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError("Camera access denied. Please allow camera permissions or use file upload instead.");
      setCameraActive(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      await handleFileSelected(file);
    }, "image/jpeg", 0.92);
  }, [stopCamera]);

  const handleFileSelected = async (file: File) => {
    setQualityError(null);
    setOcrResult(null);

    const quality = await checkImageQuality(file);
    if (!quality.valid) {
      setQualityError(quality.reason || "Image quality check failed");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);

    if (isPro) {
      await runOcr(file);
    }
  };

  const runOcr = async (file: File) => {
    setIsProcessing(true);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const result = extractReceiptData(data.text);
      setOcrResult(result);
      if (onOcrResult) {
        onOcrResult(result);
      }
    } catch (err) {
      console.error("OCR error:", err);
      setOcrResult({
        merchantName: "",
        date: "",
        totalAmount: null,
        confidence: 0,
        rawText: "OCR processing failed. You can enter the details manually.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("receipt", selectedFile);
    if (ocrResult) {
      formData.append("merchantName", ocrResult.merchantName);
      formData.append("receiptDate", ocrResult.date);
      if (ocrResult.totalAmount !== null) {
        formData.append("totalAmount", String(ocrResult.totalAmount));
      }
      formData.append("ocrConfidence", String(ocrResult.confidence));
      formData.append("ocrData", JSON.stringify({ rawText: ocrResult.rawText }));
    }

    uploadMutation.mutate(formData, {
      onSuccess: () => {
        resetState();
        setOpen(false);
      },
    });
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreview(null);
    setQualityError(null);
    setOcrResult(null);
    stopCamera();
    if (preview) URL.revokeObjectURL(preview);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    setOpen(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" data-testid="button-scan-receipt">
              <ScanLine className="mr-2 h-4 w-4" />
              Scan Receipt
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-receipt-title">
              <ScanLine className="h-5 w-5" />
              {isPro ? "AI Receipt Scanner" : "Upload Receipt"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedFile && !cameraActive && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {isPro ? (
                    <Button
                      variant="outline"
                      className="h-24 flex-col gap-2"
                      onClick={startCamera}
                      data-testid="button-camera-capture"
                    >
                      <Camera className="h-6 w-6" />
                      <span className="text-xs">Live Scan</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-24 flex-col gap-2 opacity-60"
                      onClick={() => checkoutMutation.mutate()}
                      disabled={checkoutMutation.isPending}
                      data-testid="button-camera-locked"
                    >
                      <div className="relative">
                        <Camera className="h-6 w-6" />
                        <Lock className="h-3 w-3 absolute -top-1 -right-1 text-muted-foreground" />
                      </div>
                      <span className="text-xs">Live Scan (Pro)</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-file-upload"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-xs">Upload Photo</span>
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                  data-testid="input-receipt-file"
                />

                {!isPro && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-2">
                        <Crown className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="text-xs leading-relaxed">
                          <p className="font-medium mb-1" data-testid="text-scanner-upsell">Stop typing, start driving.</p>
                          <p className="text-muted-foreground">
                            Upgrade to Pro to unlock the AI Receipt Scanner. Just point your camera, and we'll handle the Merchant, Date, and Totals for you.
                          </p>
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={() => checkoutMutation.mutate()}
                            disabled={checkoutMutation.isPending}
                            data-testid="button-upgrade-scanner"
                          >
                            {checkoutMutation.isPending ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Crown className="mr-1 h-3 w-3" />
                            )}
                            Upgrade to Pro
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {cameraActive && (
              <div className="space-y-3">
                <div className="relative rounded-md overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full"
                    data-testid="video-camera-feed"
                  />
                  <div className="absolute inset-0 border-2 border-dashed border-white/30 m-4 rounded pointer-events-none" />
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1" data-testid="button-take-photo">
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                  <Button variant="outline" onClick={stopCamera} data-testid="button-cancel-camera">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {cameraError && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="py-3 px-4 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive" data-testid="text-camera-error">{cameraError}</p>
                </CardContent>
              </Card>
            )}

            {preview && selectedFile && (
              <div className="space-y-3">
                <div className="relative rounded-md overflow-hidden border">
                  <img src={preview} alt="Receipt preview" className="w-full max-h-64 object-contain bg-muted/30" data-testid="img-receipt-preview" />
                </div>

                {isProcessing && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="py-4 px-4 flex items-center justify-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm font-medium" data-testid="text-ocr-processing">AI is reading your receipt...</span>
                    </CardContent>
                  </Card>
                )}

                {ocrResult && !isProcessing && (
                  <Card className="border-green-500/20 bg-green-500/5 dark:bg-green-900/10">
                    <CardContent className="py-3 px-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span data-testid="text-ocr-complete">Scan Complete</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {ocrResult.confidence}% confidence
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground w-16 shrink-0">Merchant</Label>
                          <Input
                            value={ocrResult.merchantName}
                            onChange={(e) => setOcrResult({ ...ocrResult, merchantName: e.target.value })}
                            className="h-8 text-sm"
                            data-testid="input-ocr-merchant"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground w-16 shrink-0">Date</Label>
                          <Input
                            type="date"
                            value={ocrResult.date}
                            onChange={(e) => setOcrResult({ ...ocrResult, date: e.target.value })}
                            className="h-8 text-sm"
                            data-testid="input-ocr-date"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground w-16 shrink-0">Total</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={ocrResult.totalAmount ?? ""}
                            onChange={(e) => setOcrResult({ ...ocrResult, totalAmount: e.target.value ? Number(e.target.value) : null })}
                            className="h-8 text-sm"
                            data-testid="input-ocr-total"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    className="flex-1"
                    disabled={uploadMutation.isPending}
                    data-testid="button-save-receipt"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    {onOcrResult && ocrResult ? "Save & Auto-Fill Expense" : "Save Receipt"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetState}
                    data-testid="button-retake-receipt"
                  >
                    Retake
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!qualityError} onOpenChange={() => setQualityError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Image Quality Warning
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-quality-error">
              {qualityError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setQualityError(null)} data-testid="button-dismiss-quality">
              Try Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
