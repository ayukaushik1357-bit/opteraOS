import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Edit2,
  HelpCircle,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWorkspace } from "@/components/app/AppShell";
import {
  createConversation,
  deleteConversation,
  executeAIAction,
  listConversations,
  listMessages,
  sendMessage,
} from "@/lib/ai.functions";
import type { MetricWidgetData, PendingAction } from "@/lib/ai/ai.types";
import { shortDate } from "@/lib/format";

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

function parseMessageContent(rawContent: string): {
  cleanText: string;
  pendingActions: PendingAction[];
  metricWidget?: MetricWidgetData | undefined;
} {
  if (!rawContent) return { cleanText: "", pendingActions: [] };

  let cleanText = rawContent;
  let pendingActions: PendingAction[] = [];
  let metricWidget: MetricWidgetData | undefined = undefined;

  if (cleanText.includes("__METRIC_WIDGET__:")) {
    const parts = cleanText.split("__METRIC_WIDGET__:");
    if (parts[0] !== undefined) cleanText = parts[0].trim();
    if (parts[1] !== undefined) {
      try {
        metricWidget = JSON.parse(parts[1]);
      } catch (e) {
        console.warn("Failed to parse metric widget", e);
      }
    }
  }

  if (cleanText.includes("__PENDING_ACTIONS__:")) {
    const parts = cleanText.split("__PENDING_ACTIONS__:");
    if (parts[0] !== undefined) cleanText = parts[0].trim();
    if (parts[1] !== undefined) {
      try {
        pendingActions = JSON.parse(parts[1]);
      } catch (e) {
        console.warn("Failed to parse pending actions", e);
      }
    }
  }

  return { cleanText, pendingActions, metricWidget };
}

const CATEGORY_PROMPTS = [
  {
    category: "Sales & Pipeline",
    icon: TrendingUp,
    prompts: [
      { label: "Show open sales pipeline", text: "Show sales pipeline & open revenue" },
      { label: "Create Acme expansion deal", text: "Create deal for Acme Enterprise value 50000" },
      { label: "How to increase conversions?", text: "Give me a strategic plan to increase sales conversion" },
    ],
  },
  {
    category: "Finance & Invoices",
    icon: DollarSign,
    prompts: [
      { label: "Audit overdue invoices", text: "How to collect overdue invoices?" },
      { label: "Show revenue breakdown", text: "Show collected vs outstanding revenue" },
      { label: "Remind overdue clients", text: "Create task to follow up on overdue invoices" },
    ],
  },
  {
    category: "Accounts & Leads",
    icon: Users,
    prompts: [
      { label: "Overview of customer accounts", text: "Overview of customers and qualified leads" },
      { label: "Add Apex Solutions client", text: "Create customer profile for Apex Solutions Inc" },
    ],
  },
  {
    category: "Platform & Safety",
    icon: HelpCircle,
    prompts: [
      { label: "What is opteraOS?", text: "What is opteraOS & how does it work?" },
      { label: "How do Action Cards work?", text: "How do AI Action Cards protect data?" },
    ],
  },
];

const FOLLOWUP_OPTIONS = [
  { label: "📊 Sales Pipeline", prompt: "Show sales pipeline & open revenue" },
  { label: "💳 Audit Overdue Invoices", prompt: "How to collect overdue invoices?" },
  { label: "💼 Create New Deal", prompt: "Create deal for Acme Enterprise value 50000" },
  { label: "📝 Schedule Follow-up Task", prompt: "Create task for client follow up due tomorrow" },
  { label: "🎯 Strategic Growth Plan", prompt: "Give me a strategic growth plan for my business" },
  { label: "🏁 End Session", prompt: "End Chat" },
];

export function AiAssistantDrawer() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();

  const fetchConversations = useServerFn(listConversations);
  const fetchMessages = useServerFn(listMessages);
  const send = useServerFn(sendMessage);
  const createConv = useServerFn(createConversation);
  const deleteConv = useServerFn(deleteConversation);
  const executeActionFn = useServerFn(executeAIAction);

  const [open, setOpen] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [inputMsg, setInputMsg] = useState("");
  const [activeCategory, setActiveCategory] = useState("Sales & Pipeline");
  const [isRecording, setIsRecording] = useState(false);
  const [editablePayloads, setEditablePayloads] = useState<Record<string, Record<string, any>>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const orgId = current?.id;

  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ["aiConversations", orgId],
    queryFn: () => (orgId ? fetchConversations({ data: { orgId } }) : Promise.resolve([])),
    enabled: !!orgId && open,
  });

  const activeConv =
    (conversations as Array<{ id: string; title: string }>).find((c) => c.id === activeConvId) ??
    conversations[0] ??
    null;
  const currentConvId = activeConv?.id ?? null;

  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ["aiMessages", orgId, currentConvId],
    queryFn: () =>
      orgId && currentConvId
        ? fetchMessages({ data: { orgId, conversationId: currentConvId } })
        : Promise.resolve([]),
    enabled: !!orgId && !!currentConvId && open,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      if (!orgId) throw new Error("No active workspace selected");
      return send({
        data: {
          orgId,
          conversationId: currentConvId || undefined,
          message: text,
        },
      });
    },
    onSuccess: (res) => {
      setInputMsg("");
      queryClient.invalidateQueries({ queryKey: ["aiConversations", orgId] });
      queryClient.invalidateQueries({ queryKey: ["aiMessages", orgId, res.conversationId] });
      if (!currentConvId) {
        setActiveConvId(res.conversationId);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!orgId) throw new Error("No active workspace selected");
      return createConv({ data: { orgId } });
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["aiConversations", orgId] });
      setActiveConvId(conv.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!orgId) throw new Error("No active workspace selected");
      return deleteConv({ data: { orgId, id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiConversations", orgId] });
      if (activeConvId === currentConvId) setActiveConvId(null);
      toast.success("Conversation deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, decision, customPayload }: { action: PendingAction; decision: "approve" | "reject"; customPayload?: Record<string, any> }) => {
      if (!orgId || !currentConvId) throw new Error("Missing active workspace or conversation");
      return executeActionFn({
        data: {
          orgId,
          conversationId: currentConvId,
          toolName: action.toolName,
          payload: customPayload || action.payload,
          decision,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aiMessages", orgId, currentConvId] });
      queryClient.invalidateQueries({ queryKey: ["deals", orgId] });
      queryClient.invalidateQueries({ queryKey: ["customers", orgId] });
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      if (variables.decision === "approve") {
        toast.success(`Action "${variables.action.title}" executed successfully!`);
      } else {
        toast.info("Action cancelled");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!inputMsg.trim() || sendMutation.isPending || !orgId) return;
    sendMutation.mutate(inputMsg.trim());
  }

  function handleEndChat() {
    if (!currentConvId || sendMutation.isPending || !orgId) return;
    sendMutation.mutate("End Chat");
  }

  function toggleVoiceDictation() {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
        toast.info("Listening... Speak your command.");
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join("");
        setInputMsg(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
        toast.error("Voice dictation error. Please try again.");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("Speech recognition failed to start", e);
      setIsRecording(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Response copied to clipboard!");
  }

  function handlePayloadChange(actionId: string, field: string, val: any) {
    setEditablePayloads((prev) => ({
      ...prev,
      [actionId]: {
        ...(prev[actionId] || {}),
        [field]: val,
      },
    }));
  }

  const selectedCategoryObj = CATEGORY_PROMPTS.find((c) => c.category === activeCategory) ?? CATEGORY_PROMPTS[0]!;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          className="gap-2 bg-gradient-brand text-primary-foreground shadow-lg hover:opacity-90 transition-all hover:scale-105"
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>optera AI</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        {/* Header Bar */}
        <SheetHeader className="border-b border-border/60 p-3.5 bg-background/95 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base font-bold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold leading-none">optera AI Agent</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {current?.name || "Autonomous Business OS"}
                </span>
              </div>
            </SheetTitle>
            <div className="flex items-center gap-1.5">
              {currentConvId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px] gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={handleEndChat}
                  disabled={sendMutation.isPending}
                >
                  <LogOut className="h-3 w-3" /> End Chat
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px] gap-1"
                onClick={() => createMutation.mutate()}
              >
                <Plus className="h-3 w-3" /> New Chat
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Proactive Business Alert Banner */}
        <div className="border-b border-border/40 bg-amber-500/10 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 animate-bounce" />
            <span className="truncate font-medium">Proactive Alert: Audit open pipeline & overdue payments</span>
          </div>
          <button
            className="font-semibold underline shrink-0 hover:text-amber-700"
            onClick={() => sendMutation.mutate("Audit overdue invoices")}
          >
            Audit Now
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Conversations */}
          <div className="w-1/3 border-r border-border/60 bg-secondary/20 p-2">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Threads
            </div>
            <ScrollArea className="h-[calc(100vh-160px)]">
              {loadingConvs ? (
                <div className="space-y-2 p-1">
                  <div className="h-8 rounded bg-secondary/50 animate-pulse" />
                  <div className="h-8 rounded bg-secondary/50 animate-pulse" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="p-2 text-[11px] text-muted-foreground">No conversations yet.</p>
              ) : (
                <div className="space-y-1">
                  {conversations.map((c) => {
                    const isActive = c.id === currentConvId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveConvId(c.id)}
                        className={`group flex items-center justify-between rounded-lg p-2 text-xs cursor-pointer transition-all ${isActive
                          ? "bg-secondary text-foreground font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                          }`}
                      >
                        <span className="truncate pr-1">{c.title}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(c.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Main Chat Area */}
          <div className="flex w-2/3 flex-col bg-background/50">
            <ScrollArea className="flex-1 p-3">
              {loadingMsgs ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col py-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-md">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-foreground">optera Autonomous Agent</p>
                    <p className="mt-0.5 text-xs text-muted-foreground max-w-[230px]">
                      Ask business questions or execute actions via AI Action Cards.
                    </p>
                  </div>

                  {/* Category Launcher Tabs */}
                  <div className="mt-5 border-t border-border/40 pt-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-2">
                      {CATEGORY_PROMPTS.map((cat) => (
                        <button
                          key={cat.category}
                          onClick={() => setActiveCategory(cat.category)}
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${activeCategory === cat.category
                            ? "bg-brand-indigo text-white shadow-sm"
                            : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }`}
                        >
                          {cat.category}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {selectedCategoryObj.prompts.map((p) => (
                        <button
                          key={p.label}
                          className="w-full rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left transition-all hover:border-brand-indigo/60 hover:bg-secondary hover:shadow-sm"
                          onClick={() => sendMutation.mutate(p.text)}
                        >
                          <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                            <span>{p.label}</span>
                            <span className="text-[10px] text-brand-indigo font-normal">Run →</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.text}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => {
                    const isUser = m.role === "user";
                    const { cleanText, pendingActions, metricWidget } = parseMessageContent(m.content);

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`group relative max-w-[96%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${isUser
                            ? "bg-brand-indigo text-white rounded-br-none shadow-sm"
                            : "bg-secondary/80 text-foreground border border-border/60 rounded-bl-none shadow-sm"
                            }`}
                        >
                          <p className="whitespace-pre-wrap">{cleanText}</p>

                          {!isUser && (
                            <button
                              onClick={() => copyToClipboard(cleanText)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground"
                              title="Copy response"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}

                          {/* Render Rich Metric Widget if present */}
                          {metricWidget && (
                            <div className="mt-3 rounded-xl border border-border/80 bg-background/90 p-3 shadow-md">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold text-foreground">
                                  {metricWidget.title}
                                </span>
                                {metricWidget.badge && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-brand-indigo/40 text-brand-indigo">
                                    {metricWidget.badge}
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 text-base font-bold text-brand-indigo">
                                {metricWidget.value}
                              </div>
                              {metricWidget.subtitle && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {metricWidget.subtitle}
                                </p>
                              )}
                              {metricWidget.percentage !== undefined && (
                                <div className="mt-2 space-y-1">
                                  <Progress value={metricWidget.percentage} className="h-1.5" />
                                  <div className="flex justify-between text-[9px] text-muted-foreground">
                                    <span>Target Progress</span>
                                    <span>{metricWidget.percentage}%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Render Editable AI Action Cards */}
                          {pendingActions.map((act) => {
                            const customPayload = editablePayloads[act.id] || act.payload;

                            return (
                              <div
                                key={act.id}
                                className="mt-3 rounded-xl border border-brand-indigo/40 bg-background p-3 shadow-md backdrop-blur-sm"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                                    <span className="font-semibold text-foreground text-xs">
                                      {act.title}
                                    </span>
                                  </div>
                                  <Badge
                                    variant={act.safetyLevel === "high_risk_write" ? "destructive" : "secondary"}
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {act.safetyLevel === "high_risk_write" ? "High Risk Action" : "Action Request"}
                                  </Badge>
                                </div>

                                <p className="mt-1.5 text-[11px] text-muted-foreground">
                                  {act.description}
                                </p>

                                {/* Editable Input Fields inside Card */}
                                <div className="mt-2.5 space-y-1.5 rounded-lg border border-border/50 bg-secondary/30 p-2 text-[11px]">
                                  <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                                    <Edit2 className="h-3 w-3" /> Inline Card Payload (Editable):
                                  </div>
                                  {Object.entries(act.payload).map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2">
                                      <span className="w-1/3 truncate text-[10px] font-medium text-foreground">
                                        {k}:
                                      </span>
                                      <Input
                                        className="h-6 text-[11px] px-2 py-0"
                                        value={customPayload[k] ?? v ?? ""}
                                        onChange={(e) =>
                                          handlePayloadChange(
                                            act.id,
                                            k,
                                            typeof v === "number" ? Number(e.target.value) || 0 : e.target.value,
                                          )
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-3 flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/10"
                                    disabled={actionMutation.isPending}
                                    onClick={() => actionMutation.mutate({ action: act, decision: "reject" })}
                                  >
                                    <X className="mr-1 h-3 w-3" /> Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-7 px-2.5 text-[11px] bg-brand-indigo hover:opacity-90 text-white"
                                    disabled={actionMutation.isPending}
                                    onClick={() =>
                                      actionMutation.mutate({
                                        action: act,
                                        decision: "approve",
                                        customPayload,
                                      })
                                    }
                                  >
                                    {actionMutation.isPending ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="mr-1 h-3 w-3" />
                                    )}
                                    Approve & Execute
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <span className="mt-1 text-[10px] text-muted-foreground">
                          {shortDate(m.created_at)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Re-appearing Follow-up Options Card after AI response */}
                  {!sendMutation.isPending && (
                    <div className="mt-4 rounded-2xl border border-brand-indigo/30 bg-secondary/30 p-3 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-brand-cyan" />
                        <span>What would you like to do next?</span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {FOLLOWUP_OPTIONS.map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => sendMutation.mutate(opt.prompt)}
                            disabled={sendMutation.isPending}
                            className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground shadow-xs transition-all hover:border-brand-indigo hover:bg-brand-indigo/10 hover:text-brand-indigo"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {sendMutation.isPending && (
                    <div className="flex items-center gap-2 rounded-2xl bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>optera AI is reasoning...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Always-On Quick Category Options Toolbar + Input Footer */}
            <div className="border-t border-border/60 bg-background/95 p-2.5">
              {/* Category selector chips */}
              <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                <span className="font-semibold text-muted-foreground shrink-0 text-[10px] uppercase tracking-wider">
                  Options:
                </span>
                {selectedCategoryObj.prompts.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => sendMutation.mutate(p.text)}
                    disabled={sendMutation.isPending}
                    className="shrink-0 rounded-md border border-border/70 bg-secondary/40 px-2 py-0.5 text-[11px] font-medium text-foreground transition-all hover:border-brand-indigo hover:bg-brand-indigo/10"
                  >
                    ⚡ {p.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2">
                <Input
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder={
                    isRecording ? "Listening... Speak your command..." : "Ask optera AI or select an option above..."
                  }
                  className={`h-9 text-xs transition-colors ${isRecording ? "border-red-500 bg-red-500/10 placeholder:text-red-500" : ""
                    }`}
                  disabled={sendMutation.isPending || !orgId}
                />
                <Button
                  type="button"
                  size="sm"
                  variant={isRecording ? "destructive" : "outline"}
                  className="h-9 w-9 p-0 shrink-0"
                  onClick={toggleVoiceDictation}
                  title="Voice Command Dictation"
                >
                  {isRecording ? <MicOff className="h-4 w-4 animate-bounce" /> : <Mic className="h-4 w-4 text-muted-foreground" />}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 w-9 bg-gradient-brand p-0 text-primary-foreground shadow-sm shrink-0"
                  disabled={!inputMsg.trim() || sendMutation.isPending || !orgId}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
