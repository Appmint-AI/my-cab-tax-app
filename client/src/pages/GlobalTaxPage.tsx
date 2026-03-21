import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useRegion, RegionType } from "@/hooks/use-region";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Globe, CheckCircle, Loader2, Send, Bot, User, RefreshCw, DollarSign, FileText, Calendar, Shield } from "lucide-react";

const COUNTRIES = [
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    currency: "USD ($)",
    taxSystem: "IRS Schedule C / Self-Employment Tax",
    keyRules: [
      "15.3% Self-Employment Tax (Social Security + Medicare)",
      "Schedule C deductions: vehicle, phone, insurance, supplies",
      "Quarterly estimated tax payments (1040-ES)",
      "$20,000 / 200 transactions 1099-K threshold",
      "Standard mileage rate: 70¢/mile (2026)",
    ],
    aiContext: "US IRS tax rules for self-employed rideshare drivers",
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP (£)",
    taxSystem: "HMRC Self Assessment / Making Tax Digital",
    keyRules: [
      "Income Tax: 20% Basic / 40% Higher / 45% Additional",
      "Class 2 NIC: £3.45/week; Class 4 NIC: 9% on profits",
      "Trading Allowance: £1,000 tax-free",
      "MTD: quarterly digital submissions required",
      "Mileage: 45p/mile first 10,000; 25p thereafter",
    ],
    aiContext: "UK HMRC self-assessment and Making Tax Digital for rideshare drivers",
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    currency: "CAD (CA$)",
    taxSystem: "CRA T2125 / GST/HST Registration",
    keyRules: [
      "Federal income tax: 15%–33% progressive brackets",
      "Provincial tax varies by province (0%–20%+)",
      "CPP contributions required on self-employment income",
      "GST/HST registration mandatory if >CA$30,000/year",
      "Vehicle expenses: logbook method or flat rate",
    ],
    aiContext: "Canada CRA self-employment tax rules for rideshare drivers, GST/HST, T2125",
  },
  {
    code: "MX",
    name: "Mexico",
    flag: "🇲🇽",
    currency: "MXN (MX$)",
    taxSystem: "SAT ISR / IVA Régimen Simplificado",
    keyRules: [
      "ISR (Income Tax): 1.5%–35% progressive brackets",
      "IVA (VAT): 16% on services (rideshare platforms collect it)",
      "RESICO regime: simplified 1%–2.5% monthly flat rate",
      "SAT e-invoicing (CFDI) required for all transactions",
      "Platforms (Uber, DiDi) withhold and remit taxes on your behalf",
    ],
    aiContext: "Mexico SAT tax rules for rideshare drivers, ISR, IVA, RESICO regime",
  },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function AiTaxAssistant({ country }: { country: typeof COUNTRIES[0] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hello! I'm your ${country.name} tax assistant. I can answer questions about ${country.aiContext}. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState("");

  const { data: taxData } = useQuery<any>({
    queryKey: ["/api/tax/summary"],
    staleTime: 1000 * 60 * 5,
  });

  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/global-tax-assistant", {
        question,
        countryCode: country.code,
        countryContext: country.aiContext,
        userTaxData: taxData || null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't get an answer right now. Please try again." },
      ]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    const question = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    chatMutation.mutate(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    `What expenses can I deduct as a ${country.name} rideshare driver?`,
    `How do I calculate my quarterly tax payments in ${country.name}?`,
    `What mileage rate applies in ${country.name} for 2026?`,
    `Do I need to register for ${country.code === "CA" ? "GST/HST" : country.code === "MX" ? "IVA" : country.code === "GB" ? "VAT" : "sales tax"}?`,
  ];

  return (
    <div className="space-y-4">
      <div className="h-80 overflow-y-auto space-y-3 p-3 rounded-lg bg-muted/20 border border-border/50" data-testid="div-chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"}`}>
              {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-background border border-border/50 text-foreground"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex gap-2">
            <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-background border border-border/50 rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {quickQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => {
              setMessages((prev) => [...prev, { role: "user", content: q }]);
              chatMutation.mutate(q);
            }}
            disabled={chatMutation.isPending}
            className="text-xs px-3 py-2 rounded-full border border-border/60 bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 text-left"
            data-testid={`button-quick-q-${i}`}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask about ${country.name} tax rules...`}
          className="min-h-[44px] max-h-24 resize-none text-sm"
          rows={1}
          data-testid="input-tax-question"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || chatMutation.isPending}
          size="icon"
          className="shrink-0 h-11 w-11 touch-manipulation"
          data-testid="button-send-question"
        >
          {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function GlobalTaxPage() {
  const { region, switchRegion, isSwitching, detectedCountry } = useRegion();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(detectedCountry || "US");

  const activeCountry = COUNTRIES.find((c) => c.code === (selectedCountryCode === "GB" ? "GB" : selectedCountryCode)) || COUNTRIES[0];

  const handleSwitchRegion = (code: string) => {
    switchRegion(code);
    toast({
      title: "Region Updated",
      description: `Your tax region is now set to ${COUNTRIES.find((c) => c.code === code)?.name || code}.`,
    });
  };

  return (
    <Layout>
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-global-tax-title">
          <Globe className="h-6 w-6 text-primary" />
          Global Tax Centre
        </h1>
        <p className="text-sm text-muted-foreground">
          Select your country for localised tax rules, rates, and AI-powered guidance.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COUNTRIES.map((country) => {
          const isActive = selectedCountryCode === country.code || (selectedCountryCode === "GB" && country.code === "GB");
          const isCurrentRegion = (region === "US" && country.code === "US") ||
            (region === "UK" && country.code === "GB") ||
            (region === "CA" && country.code === "CA") ||
            (region === "MX" && country.code === "MX");
          return (
            <button
              key={country.code}
              onClick={() => setSelectedCountryCode(country.code)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all touch-manipulation min-h-[90px] ${
                isActive
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/30"
              }`}
              data-testid={`button-country-${country.code}`}
            >
              {isCurrentRegion && (
                <Badge className="absolute -top-2 -right-2 text-[9px] px-1.5 py-0 no-default-active-elevate" variant="default">
                  Active
                </Badge>
              )}
              <span className="text-3xl leading-none">{country.flag}</span>
              <span className="text-xs font-medium text-center leading-tight">{country.name}</span>
              <span className="text-[10px] text-muted-foreground">{country.currency}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-tax-rules">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-2xl">{activeCountry.flag}</span>
                {activeCountry.name} — Tax Overview
              </CardTitle>
              <Button
                size="sm"
                variant={selectedCountryCode === (region === "UK" ? "GB" : region) ? "secondary" : "default"}
                onClick={() => handleSwitchRegion(activeCountry.code)}
                disabled={isSwitching}
                className="shrink-0 touch-manipulation"
                data-testid="button-apply-region"
              >
                {isSwitching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Use {activeCountry.name} Settings
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{activeCountry.taxSystem}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Key Tax Rules for Rideshare Drivers</p>
              <ul className="space-y-2">
                {activeCountry.keyRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400 mb-1" />
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="text-sm font-semibold">{activeCountry.currency}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400 mb-1" />
                <p className="text-xs text-muted-foreground">Tax Authority</p>
                <p className="text-sm font-semibold">
                  {activeCountry.code === "US" ? "IRS" : activeCountry.code === "GB" ? "HMRC" : activeCountry.code === "CA" ? "CRA" : "SAT"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400 mb-1" />
                <p className="text-xs text-muted-foreground">Filing Deadline</p>
                <p className="text-sm font-semibold">
                  {activeCountry.code === "US" ? "April 15" : activeCountry.code === "GB" ? "Jan 31" : activeCountry.code === "CA" ? "June 15" : "April 30"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400 mb-1" />
                <p className="text-xs text-muted-foreground">Main Form</p>
                <p className="text-sm font-semibold">
                  {activeCountry.code === "US" ? "Schedule C" : activeCountry.code === "GB" ? "SA103S" : activeCountry.code === "CA" ? "T2125" : "DIOT / CFDI"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-ai-assistant">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              AI Tax Assistant — {activeCountry.flag} {activeCountry.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Powered by Gemini AI. Ask anything about {activeCountry.name} rideshare driver tax rules.
            </p>
          </CardHeader>
          <CardContent>
            <AiTaxAssistant country={activeCountry} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
