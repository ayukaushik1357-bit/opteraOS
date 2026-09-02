import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OrgContextSummary, PendingAction } from "@/lib/ai/ai.types";
import { generateAIResponse } from "@/lib/ai/ai.service";
import { executeTool } from "@/lib/ai/ai.tools";

async function verifyOrgMember(supabase: any, orgId: string, userId: string) {
  const { data: member, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (isTableMissingError(error)) {
      return { role: "member" };
    }
    throw new Error("Unauthorized: Access denied to this organization.");
  }

  if (!member) {
    throw new Error("Unauthorized: You are not a member of this organization.");
  }

  return member;
}

async function fetchOrgContext(supabase: any, orgId: string): Promise<OrgContextSummary> {
  let org = { name: "Workspace", currency: "INR" };
  let customers: any[] = [];
  let deals: any[] = [];
  let invoices: any[] = [];
  let leads: any[] = [];

  try {
    const [orgRes, custRes, dealRes, invRes, leadRes] = await Promise.all([
      supabase.from("organizations").select("name, currency").eq("id", orgId).single(),
      supabase.from("customers").select("id, status").eq("org_id", orgId),
      supabase.from("deals").select("id, title, value, stage").eq("org_id", orgId),
      supabase.from("invoices").select("id, number, amount, status").eq("org_id", orgId),
      supabase.from("leads").select("id, stage").eq("org_id", orgId),
    ]);

    org = orgRes.data || org;
    customers = custRes.data || [];
    deals = dealRes.data || [];
    invoices = invRes.data || [];
    leads = leadRes.data || [];
  } catch (e) {
    console.warn("[optera AI] Error fetching full context, using safe defaults:", e);
  }

  const openDeals = deals.filter((d: any) => d.stage !== "won" && d.stage !== "lost");
  const pipelineValue = openDeals.reduce((sum: number, d: any) => sum + Number(d.value || 0), 0);

  let collectedRevenue = 0;
  let outstandingRevenue = 0;
  let overdueInvoices = 0;
  for (const inv of invoices) {
    const amount = Number(inv.amount || 0);
    if (inv.status === "paid") {
      collectedRevenue += amount;
    } else if (inv.status === "sent" || inv.status === "overdue") {
      outstandingRevenue += amount;
      if (inv.status === "overdue") overdueInvoices++;
    }
  }

  return {
    orgName: org.name,
    currency: org.currency || "INR",
    totalCustomers: customers.length,
    activeCustomers: customers.filter((c: any) => c.status === "active").length,
    prospectCustomers: customers.filter((c: any) => c.status === "prospect").length,
    totalDeals: deals.length,
    openDeals: openDeals.length,
    pipelineValue,
    totalInvoices: invoices.length,
    overdueInvoices,
    collectedRevenue,
    outstandingRevenue,
    totalLeads: leads.length,
    qualifiedLeads: leads.filter((l: any) => l.stage === "qualified").length,
    recentDeals: openDeals
      .slice(0, 5)
      .map((d: any) => ({ title: d.title, value: Number(d.value || 0), stage: d.stage })),
    recentInvoices: invoices
      .slice(0, 5)
      .map((i: any) => ({ number: i.number, amount: Number(i.amount || 0), status: i.status })),
  };
}

// Memory fallback store in case database migrations are not yet applied on Supabase
const memoryConversations = new Map<string, any[]>();
const memoryMessages = new Map<string, any[]>();

function generateFallbackUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0");
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("could not find table") ||
    msg.includes("does not exist") ||
    msg.includes("42p01") ||
    msg.includes("relation") ||
    msg.includes("schema")
  );
}

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ orgId: z.string().uuid(), title: z.string().trim().min(1).max(100).optional() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await verifyOrgMember(context.supabase, data.orgId, context.userId);

    const { data: conv, error } = await context.supabase
      .from("ai_conversations")
      .insert({
        org_id: data.orgId,
        user_id: context.userId,
        title: data.title || "New Conversation",
      })
      .select("id, org_id, user_id, title, created_at, updated_at")
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        const fallbackConv = {
          id: generateFallbackUuid(),
          org_id: data.orgId,
          user_id: context.userId,
          title: data.title || "New Conversation",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const existing = memoryConversations.get(data.orgId) || [];
        memoryConversations.set(data.orgId, [fallbackConv, ...existing]);
        return fallbackConv;
      }
      throw new Error(error.message);
    }
    return conv;
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await verifyOrgMember(context.supabase, data.orgId, context.userId);

    const { data: convs, error } = await context.supabase
      .from("ai_conversations")
      .select("id, org_id, user_id, title, created_at, updated_at")
      .eq("org_id", data.orgId)
      .order("updated_at", { ascending: false });

    if (error) {
      if (isTableMissingError(error)) {
        return memoryConversations.get(data.orgId) || [];
      }
      throw new Error(error.message);
    }
    return convs ?? [];
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orgId: z.string().uuid(), id: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await verifyOrgMember(context.supabase, data.orgId, context.userId);

    const { data: conv, error } = await context.supabase
      .from("ai_conversations")
      .select("id, org_id, user_id, title, created_at, updated_at")
      .eq("org_id", data.orgId)
      .eq("id", data.id)
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        const convs = memoryConversations.get(data.orgId) || [];
        const found = convs.find((c) => c.id === data.id);
        if (found) return found;
      }
      throw new Error("Conversation not found");
    }
    return conv;
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orgId: z.string().uuid(), conversationId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await verifyOrgMember(context.supabase, data.orgId, context.userId);

    const { data: msgs, error } = await context.supabase
      .from("ai_messages")
      .select("id, conversation_id, org_id, user_id, role, content, created_at")
      .eq("org_id", data.orgId)
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      if (isTableMissingError(error)) {
        return memoryMessages.get(data.conversationId) || [];
      }
      throw new Error(error.message);
    }
    return msgs ?? [];
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        conversationId: z.string().min(1).optional(),
        message: z.string().trim().min(1).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await verifyOrgMember(context.supabase, data.orgId, context.userId);

    let conversationId = data.conversationId;
    let isFallbackMode = false;

    if (!conversationId) {
      const title = data.message.slice(0, 30) + (data.message.length > 30 ? "..." : "");
      const { data: conv, error: convErr } = await context.supabase
        .from("ai_conversations")
        .insert({
          org_id: data.orgId,
          user_id: context.userId,
          title,
        })
        .select("id")
        .single();

      if (convErr) {
        if (isTableMissingError(convErr)) {
          isFallbackMode = true;
          conversationId = generateFallbackUuid();
          const fallbackConv = {
            id: conversationId,
            org_id: data.orgId,
            user_id: context.userId,
            title,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const existing = memoryConversations.get(data.orgId) || [];
          memoryConversations.set(data.orgId, [fallbackConv, ...existing]);
        } else {
          throw new Error(convErr.message);
        }
      } else if (conv) {
        conversationId = conv.id;
      }
    }

    if (!conversationId) {
      throw new Error("Could not initialize conversation ID");
    }

    if (!isFallbackMode) {
      const { error: userMsgErr } = await context.supabase.from("ai_messages").insert({
        conversation_id: conversationId,
        org_id: data.orgId,
        user_id: context.userId,
        role: "user",
        content: data.message,
      });

      if (userMsgErr && isTableMissingError(userMsgErr)) {
        isFallbackMode = true;
      }
    }

    if (isFallbackMode && conversationId) {
      const userMsg = {
        id: generateFallbackUuid(),
        conversation_id: conversationId,
        org_id: data.orgId,
        user_id: context.userId,
        role: "user",
        content: data.message,
        created_at: new Date().toISOString(),
      };
      const existingMsgs = memoryMessages.get(conversationId) || [];
      memoryMessages.set(conversationId, [...existingMsgs, userMsg]);
    }

    let history: any[] = [];
    if (!isFallbackMode && conversationId) {
      const { data: dbHistory } = await context.supabase
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(10);
      history = dbHistory || [];
    } else if (conversationId) {
      history = (memoryMessages.get(conversationId) || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }

    const llmMessages = (history ?? []).map((m: any) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    const orgContext = await fetchOrgContext(context.supabase, data.orgId);

    // ── RAG: Retrieve relevant knowledge base chunks ─────────────────────────
    // This grounds AI responses in org-specific uploaded documents.
    // Org isolation is enforced: org_id is always passed and enforced by RLS.
    let ragContext: string | undefined;
    try {
      const { generateQueryEmbedding: genEmb } = await import("@/lib/rag.functions");
      const queryEmb = await genEmb(data.message);
      let ragChunks: any[] = [];

      if (queryEmb) {
        const { data: vectorChunks, error: rpcErr } = await context.supabase.rpc(
          "match_document_chunks",
          {
            query_embedding: `[${queryEmb.join(",")}]`,
            match_threshold: 0.65,
            match_count: 3,
            p_org_id: data.orgId,
          },
        );
        if (!rpcErr && vectorChunks && Array.isArray(vectorChunks) && vectorChunks.length > 0) {
          ragChunks = vectorChunks;
        }
      }

      // Keyword fallback
      if (ragChunks.length === 0) {
        const keywords = data.message
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 3)
          .join(" ");
        if (keywords) {
          const { data: kwChunks } = await context.supabase
            .from("document_chunks")
            .select("content")
            .eq("org_id", data.orgId)
            .ilike("content", `%${keywords}%`)
            .limit(3);
          ragChunks = kwChunks ?? [];
        }
      }

      if (ragChunks.length > 0) {
        ragContext = ragChunks
          .map((c: any, idx: number) => `[Document ${idx + 1}]: ${c.content}`)
          .join("\n\n");
      }
    } catch (ragErr: any) {
      // Non-fatal: proceed without RAG context
      console.warn("[optera AI] RAG retrieval failed:", ragErr.message);
    }

    let aiResponse;
    let errorMessage: string | null = null;

    try {
      aiResponse = await generateAIResponse(llmMessages, orgContext, ragContext);
    } catch (err: any) {
      errorMessage = err?.message ?? "AI processing error";
      aiResponse = {
        content: "I encountered an error processing your query. Please try again.",
        provider: "error-fallback",
        model: "none",
      };
    }

    let finalContent = aiResponse.content;
    if (aiResponse.pendingActions && aiResponse.pendingActions.length > 0) {
      finalContent += `\n\n__PENDING_ACTIONS__:${JSON.stringify(aiResponse.pendingActions)}`;
    }
    if (aiResponse.metricWidget) {
      finalContent += `\n\n__METRIC_WIDGET__:${JSON.stringify(aiResponse.metricWidget)}`;
    }

    let assistantMsg: any;
    if (!isFallbackMode && conversationId) {
      const { data: dbAsstMsg, error: asstErr } = await context.supabase
        .from("ai_messages")
        .insert({
          conversation_id: conversationId,
          org_id: data.orgId,
          user_id: context.userId,
          role: "assistant",
          content: finalContent,
        })
        .select("id, conversation_id, org_id, user_id, role, content, created_at")
        .single();

      if (asstErr && isTableMissingError(asstErr)) {
        isFallbackMode = true;
      } else {
        assistantMsg = dbAsstMsg;
      }
    }

    if (isFallbackMode || !assistantMsg) {
      assistantMsg = {
        id: generateFallbackUuid(),
        conversation_id: conversationId,
        org_id: data.orgId,
        user_id: context.userId,
        role: "assistant",
        content: finalContent,
        created_at: new Date().toISOString(),
      };
      if (conversationId) {
        const existingMsgs = memoryMessages.get(conversationId) || [];
        memoryMessages.set(conversationId, [...existingMsgs, assistantMsg]);
      }
    }

    try {
      await context.supabase.from("ai_action_logs").insert({
        org_id: data.orgId,
        user_id: context.userId,
        action_type: "send_message",
        status: errorMessage ? "error" : "success",
        input: { message: data.message, conversationId },
        output: { provider: aiResponse.provider, model: aiResponse.model },
        error_message: errorMessage,
      });
    } catch (e) {
      // Ignore action log table missing
    }

    return {
      conversationId: conversationId!,
      message: assistantMsg,
      pendingActions: aiResponse.pendingActions,
    };
  });

export const executeAIAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        conversationId: z.string().min(1),
        toolName: z.string(),
        payload: z.record(z.any()),
        decision: z.enum(["approve", "reject"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await verifyOrgMember(context.supabase, data.orgId, context.userId);

    if (data.decision === "reject") {
      const noteContent = `❌ Action **${data.toolName}** was **rejected** by user.`;
      const noteMsg = {
        id: generateFallbackUuid(),
        conversation_id: data.conversationId,
        org_id: data.orgId,
        user_id: context.userId,
        role: "assistant",
        content: noteContent,
        created_at: new Date().toISOString(),
      };
      const existing = memoryMessages.get(data.conversationId) || [];
      memoryMessages.set(data.conversationId, [...existing, noteMsg]);

      return { ok: true, status: "rejected", message: noteMsg };
    }

    // Decision === "approve"
    let result;
    try {
      result = await executeTool(context.supabase, data.orgId, context.userId, data.toolName, data.payload);

      const noteContent = `✅ Action **${data.toolName}** was successfully executed!`;
      const noteMsg = {
        id: generateFallbackUuid(),
        conversation_id: data.conversationId,
        org_id: data.orgId,
        user_id: context.userId,
        role: "assistant",
        content: noteContent,
        created_at: new Date().toISOString(),
      };
      const existing = memoryMessages.get(data.conversationId) || [];
      memoryMessages.set(data.conversationId, [...existing, noteMsg]);

      return { ok: true, status: "executed", result, message: noteMsg };
    } catch (err: any) {
      throw new Error(`Failed to execute action: ${err.message}`);
    }
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orgId: z.string().uuid(), id: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await verifyOrgMember(context.supabase, data.orgId, context.userId);

    try {
      await context.supabase
        .from("ai_conversations")
        .delete()
        .eq("org_id", data.orgId)
        .eq("id", data.id);
    } catch (e) {
      // Memory fallback delete
      const convs = memoryConversations.get(data.orgId) || [];
      memoryConversations.set(
        data.orgId,
        convs.filter((c) => c.id !== data.id),
      );
      memoryMessages.delete(data.id);
    }
    return { ok: true };
  });
