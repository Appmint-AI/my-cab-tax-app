import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, FileText, DollarSign, AlertTriangle, Car, Receipt, Shield, Activity, Mail, Globe, CheckCircle, XCircle, Clock, Copy, RefreshCw, Bot, Send, Sparkles, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AdminMetrics {
  totalUsers: number;
  proUsers: number;
  verifiedUsers: number;
  totalIncomeRecords: number;
  totalExpenseRecords: number;
  totalMileageLogs: number;
  taxesFiled: number;
  auditLogEntries: number;
  activeComplianceAlerts: number;
}

interface LifecycleMetrics {
  total: number;
  byType: Record<string, number>;
  bySegment: Record<string, number>;
}

interface DnsRecord {
  record: string;
  name: string;
  type: string;
  ttl: string;
  status: string;
  value: string;
  priority?: number;
}

interface DomainDetail {
  id: string;
  name: string;
  status: string;
  records?: DnsRecord[];
  created_at?: string;
  region?: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "verified" || status === "active") {
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
  if (status === "pending" || status === "not_started") {
    return <Clock className="h-4 w-4 text-yellow-500" />;
  }
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function EmailDomainSection() {
  const { toast } = useToast();
  const [domainInput, setDomainInput] = useState("mctusa.com");

  const { data: dnsData, isLoading: dnsLoading, refetch: refetchDns } = useQuery<{ domains: DomainDetail[] }>({
    queryKey: ["/api/admin/email-domain/dns-records"],
  });

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await apiRequest("POST", "/api/admin/email-domain/add", { domain });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Domain registered with Resend", description: "DNS records are now available below." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-domain/dns-records"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add domain", description: err.message, variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const res = await apiRequest("POST", "/api/admin/email-domain/verify", { domainId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Verification triggered", description: "Resend is checking your DNS records now." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-domain/dns-records"] });
    },
    onError: (err: Error) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const domains = dnsData?.domains || [];
  const hasDomains = domains.length > 0;

  return (
    <div className="space-y-4">
      <Card data-testid="card-email-domain">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Email Domain Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Register your custom domain with Resend to send emails from @mctusa.com. After registering, add the DNS records below to your domain registrar (GoDaddy, Namecheap, etc.) to authorize sending.
          </p>

          {!hasDomains && (
            <div className="flex items-center gap-2">
              <Input
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="mctusa.com"
                className="max-w-xs"
                data-testid="input-domain"
              />
              <Button
                onClick={() => addDomainMutation.mutate(domainInput)}
                disabled={addDomainMutation.isPending || !domainInput}
                data-testid="button-add-domain"
              >
                {addDomainMutation.isPending ? "Registering..." : "Register Domain"}
              </Button>
            </div>
          )}

          {dnsLoading && <p className="text-sm text-muted-foreground">Loading domain status...</p>}

          {domains.map((domain) => (
            <div key={domain.id} className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <StatusIcon status={domain.status} />
                  <span className="font-medium text-sm">{domain.name}</span>
                  <Badge variant={domain.status === "verified" ? "default" : "secondary"} data-testid={`badge-domain-status-${domain.id}`}>
                    {domain.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchDns()}
                    data-testid="button-refresh-dns"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                  {domain.status !== "verified" && (
                    <Button
                      size="sm"
                      onClick={() => verifyMutation.mutate(domain.id)}
                      disabled={verifyMutation.isPending}
                      data-testid="button-verify-domain"
                    >
                      {verifyMutation.isPending ? "Verifying..." : "Verify Now"}
                    </Button>
                  )}
                </div>
              </div>

              {domain.records && domain.records.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">DNS Records to Add at Your Registrar</h4>
                  <p className="text-xs text-muted-foreground">
                    Add these records at GoDaddy/Namecheap. SPF authorizes Resend, DKIM signs your emails, and DMARC tells servers what to do with failures.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse" data-testid="table-dns-records">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Purpose</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Name / Host</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Value</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                          <th className="py-2 px-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {domain.records.map((record, idx) => {
                          const purpose = record.record === "SPF" ? "SPF (Authorized Senders)"
                            : record.record === "DKIM" ? "DKIM (Digital Signature)"
                            : record.record === "DMARC" ? "DMARC (Failure Policy)"
                            : record.type === "MX" ? "MX (Mail Exchange)"
                            : record.record || record.type;

                          return (
                            <tr key={idx} className="border-b last:border-b-0">
                              <td className="py-2 px-3 font-medium">{purpose}</td>
                              <td className="py-2 px-3">
                                <Badge variant="secondary">{record.type}</Badge>
                              </td>
                              <td className="py-2 px-3 font-mono text-xs break-all max-w-[200px]">{record.name}</td>
                              <td className="py-2 px-3 font-mono text-xs break-all max-w-[300px]">{record.value}</td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1">
                                  <StatusIcon status={record.status} />
                                  <span className="text-xs">{record.status}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(record.value)}
                                  data-testid={`button-copy-dns-${idx}`}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function LifecycleEmailSection() {
  const { data: metrics, isLoading } = useQuery<LifecycleMetrics>({
    queryKey: ["/api/admin/lifecycle-metrics"],
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading email metrics...</p>;
  if (!metrics) return null;

  const typeLabels: Record<string, string> = {
    welcome: "Welcome",
    day_7_nudge: "Day 7 Nudge",
    day_30_milestone: "Day 30 Milestone",
    payment_receipt: "Payment Receipt",
    abandoned_checkout: "Abandoned Checkout",
  };

  const segmentLabels: Record<string, string> = {
    taxi: "Taxi / Rideshare",
    delivery: "Delivery Courier",
    hybrid: "Multi-App (Hybrid)",
    unknown: "Unknown",
  };

  return (
    <Card data-testid="card-lifecycle-metrics">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Lifecycle Email Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" data-testid="text-total-emails">{metrics.total}</span>
          <span className="text-sm text-muted-foreground">total emails sent</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">By Type</h4>
            <div className="space-y-1">
              {Object.entries(metrics.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm" data-testid={`metric-email-type-${type}`}>
                  <span className="text-muted-foreground">{typeLabels[type] || type}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
              {Object.keys(metrics.byType).length === 0 && (
                <p className="text-xs text-muted-foreground">No emails sent yet</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">By Segment</h4>
            <div className="space-y-1">
              {Object.entries(metrics.bySegment).map(([seg, count]) => (
                <div key={seg} className="flex justify-between text-sm" data-testid={`metric-email-segment-${seg}`}>
                  <span className="text-muted-foreground">{segmentLabels[seg] || seg}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
              {Object.keys(metrics.bySegment).length === 0 && (
                <p className="text-xs text-muted-foreground">No emails sent yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Emails are sent via Resend. Worker runs every 6 hours for time-based emails (Day 7, Day 30). Stripe webhooks trigger payment and abandoned checkout emails.
        </div>
      </CardContent>
    </Card>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_COMMANDS = [
  "How many active users do we have right now?",
  "What's the segment breakdown across our driver fleet?",
  "Check if compliance alerts need attention.",
  "Summarize our email engagement metrics.",
  "What 2026 tax law changes should I tell drivers about?",
];

function AICommandCenter() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isStreaming) return;

    const trimmed = messageText.trim();
    const userMsg: ChatMessage = { role: "user", content: trimmed };

    const historySnapshot = [...messages, userMsg];
    setMessages(historySnapshot);
    setInput("");
    setIsStreaming(true);

    const withAssistant = [...historySnapshot, { role: "assistant" as const, content: "" }];
    setMessages(withAssistant);

    try {
      const response = await fetch("/api/admin/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: trimmed,
          history: messages,
        }),
      });

      if (response.status === 403) {
        throw new Error("Access denied. Admin privileges required.");
      }
      if (!response.ok) {
        throw new Error("Failed to connect to AI assistant");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmedLine.slice(6));
            if (data.done) continue;
            if (data.error) {
              toast({ title: "AI Error", description: data.error, variant: "destructive" });
              continue;
            }
            if (data.content) {
              accumulated += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated };
                return updated;
              });
            }
          } catch {}
        }
      }

      if (buffer.trim().startsWith("data: ")) {
        try {
          const data = JSON.parse(buffer.trim().slice(6));
          if (data.content) {
            accumulated += data.content;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: accumulated };
              return updated;
            });
          }
        } catch {}
      }
    } catch (error: any) {
      toast({ title: "Connection Error", description: error.message, variant: "destructive" });
      setMessages(historySnapshot);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, messages, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Card data-testid="card-ai-command-center" className="overflow-visible">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="h-4 w-4" />
          AI Command Center
          <Badge variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            Gemini
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Your MCTUSA Executive Assistant has real-time access to fleet metrics, segment data, and 2026 tax law context. Ask anything about your driver base, compliance status, or engagement.
        </p>

        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick Commands</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_COMMANDS.map((cmd, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(cmd)}
                  disabled={isStreaming}
                  data-testid={`button-quick-cmd-${idx}`}
                >
                  {cmd}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div
            ref={scrollRef}
            className="border rounded-md p-3 max-h-96 overflow-y-auto space-y-3"
            data-testid="container-chat-messages"
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-message-${msg.role}-${idx}`}
              >
                <div
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content || (isStreaming && idx === messages.length - 1 ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Thinking...
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your Executive Assistant..."
            className="resize-none text-sm min-h-[40px] max-h-[80px]"
            disabled={isStreaming}
            data-testid="input-ai-chat"
          />
          <div className="flex flex-col gap-1">
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isStreaming}
              data-testid="button-send-ai-chat"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            {messages.length > 0 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setMessages([])}
                disabled={isStreaming}
                data-testid="button-clear-chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { data: metrics, isLoading, error } = useQuery<AdminMetrics>({
    queryKey: ["/api/admin/metrics"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="admin-loading">
        <div className="text-muted-foreground">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="admin-error">
        <div className="text-destructive">Failed to load admin metrics</div>
      </div>
    );
  }

  if (!metrics) return null;

  const cards = [
    { title: "Total Users", value: metrics.totalUsers, icon: Users, testId: "metric-total-users" },
    { title: "Pro Subscribers", value: metrics.proUsers, icon: DollarSign, testId: "metric-pro-users" },
    { title: "Verified Users", value: metrics.verifiedUsers, icon: Shield, testId: "metric-verified-users" },
    { title: "Taxes Filed", value: metrics.taxesFiled, icon: FileText, testId: "metric-taxes-filed" },
    { title: "Income Records", value: metrics.totalIncomeRecords, icon: DollarSign, testId: "metric-income-records" },
    { title: "Expense Records", value: metrics.totalExpenseRecords, icon: Receipt, testId: "metric-expense-records" },
    { title: "Mileage Logs", value: metrics.totalMileageLogs, icon: Car, testId: "metric-mileage-logs" },
    { title: "Audit Log Entries", value: metrics.auditLogEntries, icon: Activity, testId: "metric-audit-logs" },
  ];

  return (
    <div className="min-h-screen bg-background p-6" data-testid="admin-dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Business metrics, email automation, and system health</p>
          </div>
          {metrics.activeComplianceAlerts > 0 && (
            <Badge variant="destructive" data-testid="badge-compliance-alerts">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {metrics.activeComplianceAlerts} Active Alert{metrics.activeComplianceAlerts !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Card key={card.testId} data-testid={card.testId}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LifecycleEmailSection />
          <Card data-testid="card-system-info">
            <CardHeader>
              <CardTitle className="text-sm font-medium">System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Year</span>
                  <span className="font-medium">2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IRS Mileage Rate</span>
                  <span className="font-medium">$0.725/mile</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SE Tax Rate</span>
                  <span className="font-medium">15.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SALT Cap</span>
                  <span className="font-medium">$40,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1099-K Threshold</span>
                  <span className="font-medium">$20,000 / 200 tx</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tips Exemption</span>
                  <span className="font-medium">OBBBA Sec. 101</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <AICommandCenter />

        <EmailDomainSection />
      </div>
    </div>
  );
}
