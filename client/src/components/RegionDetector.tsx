import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface GeoResult {
  countryName: string;
  countryCode: string;
}

export function RegionDetector() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [detectedCountry, setDetectedCountry] = useState<GeoResult | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    const dismissedKey = "region-banner-dismissed";
    if (sessionStorage.getItem(dismissedKey)) {
      setDismissed(true);
      return;
    }

    if (!navigator.geolocation) return;

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await res.json();
          if (data.countryName && data.countryCode) {
            const userCountry = (user as any)?.stateCode ? "US" : null;
            if (userCountry && data.countryCode !== userCountry) {
              setDetectedCountry({
                countryName: data.countryName,
                countryCode: data.countryCode,
              });
            }
          }
        } catch {
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setDetecting(false);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }, [user]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("region-banner-dismissed", "true");
  };

  if (dismissed || !detectedCountry) return null;

  return (
    <div
      className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 flex items-center gap-3"
      data-testid="banner-region-detector"
    >
      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full shrink-0">
        <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-blue-800 dark:text-blue-200" data-testid="text-detected-region">
          {t("region.detected", { country: detectedCountry.countryName })}{" "}
          <span className="text-blue-600 dark:text-blue-400">
            {t("region.switchPrompt")}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
          onClick={handleDismiss}
          data-testid="button-dismiss-region"
        >
          {t("region.dismiss")}
        </Button>
        <button
          onClick={handleDismiss}
          className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
          aria-label="Close"
          data-testid="button-close-region"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
