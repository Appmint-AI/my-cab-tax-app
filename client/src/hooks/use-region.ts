import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";

export interface RegionConfig {
  region: "US" | "UK" | "OTHER";
  currency: string;
  currencySymbol: string;
  locale: string;
  taxModules: {
    showScheduleC: boolean;
    showEstimatedTax: boolean;
    showSelfEmploymentTax: boolean;
    showMTDQuarterly: boolean;
    showUniversalCredit: boolean;
    showFinalDeclaration: boolean;
    showTaxOverview: boolean;
  };
}

const DEFAULT_US_CONFIG: RegionConfig = {
  region: "US",
  currency: "USD",
  currencySymbol: "$",
  locale: "en-US",
  taxModules: {
    showScheduleC: true,
    showEstimatedTax: true,
    showSelfEmploymentTax: true,
    showMTDQuarterly: false,
    showUniversalCredit: false,
    showFinalDeclaration: false,
    showTaxOverview: false,
  },
};

export function useRegion() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: regionConfig } = useQuery<RegionConfig>({
    queryKey: ["/api/user/region-config"],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 30,
  });

  const switchRegionMutation = useMutation({
    mutationFn: async (countryCode: string) => {
      const res = await apiRequest("PATCH", "/api/user/detected-country", { countryCode });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/region-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const config = regionConfig || DEFAULT_US_CONFIG;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
    }).format(amount);
  };

  const isUK = config.region === "UK";
  const isUS = config.region === "US";

  return {
    ...config,
    isUK,
    isUS,
    formatCurrency,
    switchRegion: switchRegionMutation.mutate,
    isSwitching: switchRegionMutation.isPending,
    detectedCountry: user?.detectedCountry || null,
  };
}
