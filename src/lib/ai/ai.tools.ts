import type { ToolDefinition, PendingAction, AIActionSafetyLevel } from "./ai.types";
import { generateQueryEmbedding, hasGeminiKey } from "@/lib/rag.functions";

export const SYSTEM_TOOLS: ToolDefinition[] = [
  {
    name: "get_customer",
    description: "Fetch customer details by ID or exact email",
    safetyLevel: "read",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "Customer UUID" },
        email: { type: "string", description: "Customer email address" },
      },
    },
  },
  {
    name: "search_customers",
    description: "Search customers by name, company, or status",
    safetyLevel: "read",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
        status: { type: "string", enum: ["active", "prospect", "churned"] },
      },
    },
  },
  {
    name: "get_deal",
    description: "Fetch deal details by ID",
    safetyLevel: "read",
    parameters: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "Deal UUID" },
      },
    },
  },
  {
    name: "search_deals",
    description: "Search sales pipeline deals by stage or minimum value",
    safetyLevel: "read",
    parameters: {
      type: "object",
      properties: {
        stage: { type: "string", enum: ["lead", "qualified", "proposal", "negotiation", "won", "lost"] },
        minValue: { type: "number", description: "Minimum deal value" },
      },
    },
  },
  {
    name: "get_revenue",
    description: "Calculate overall revenue summary, collected vs outstanding amounts",
    safetyLevel: "read",
  },
  {
    name: "get_invoice",
    description: "Fetch details of an invoice by number or ID",
    safetyLevel: "read",
    parameters: {
      type: "object",
      properties: {
        invoiceNumber: { type: "string" },
        invoiceId: { type: "string" },
      },
    },
  },
  {
    name: "search_knowledge_base",
    description: "Search company SOPs, refund policies, sales scripts, and uploaded RAG knowledge base",
    safetyLevel: "read",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Search term or question" },
      },
    },
  },
  {
    name: "create_customer",
    description: "Create a new customer profile in the workspace",
    safetyLevel: "high_risk_write",
    parameters: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        status: { type: "string", enum: ["active", "prospect"], default: "prospect" },
      },
    },
  },
  {
    name: "update_customer",
    description: "Update an existing customer profile",
    safetyLevel: "high_risk_write",
    parameters: {
      type: "object",
      required: ["customerId"],
      properties: {
        customerId: { type: "string" },
        name: { type: "string" },
        company: { type: "string" },
        status: { type: "string", enum: ["active", "prospect", "churned"] },
      },
    },
  },
  {
    name: "create_deal",
    description: "Create a new deal opportunity in the pipeline",
    safetyLevel: "high_risk_write",
    parameters: {
      type: "object",
      required: ["title", "value"],
      properties: {
        title: { type: "string" },
        value: { type: "number" },
        stage: { type: "string", enum: ["lead", "qualified", "proposal", "negotiation", "won", "lost"], default: "lead" },
        customerId: { type: "string" },
        expectedClose: { type: "string", description: "ISO Date format YYYY-MM-DD" },
      },
    },
  },
  {
    name: "update_deal",
    description: "Update deal details or pipeline stage",
    safetyLevel: "high_risk_write",
    parameters: {
      type: "object",
      required: ["dealId"],
      properties: {
        dealId: { type: "string" },
        stage: { type: "string", enum: ["lead", "qualified", "proposal", "negotiation", "won", "lost"] },
        value: { type: "number" },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a task for an operational activity or follow-up",
    safetyLevel: "low_risk_write",
    parameters: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["Low", "Medium", "High", "Urgent"], default: "Medium" },
        dueDate: { type: "string" },
      },
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as completed",
    safetyLevel: "low_risk_write",
    parameters: {
      type: "object",
      required: ["taskId"],
      properties: {
        taskId: { type: "string" },
      },
    },
  },
];

export function getToolSafetyLevel(toolName: string): AIActionSafetyLevel {
  const tool = SYSTEM_TOOLS.find((t) => t.name === toolName);
  return tool ? tool.safetyLevel : "high_risk_write"; // Default unclassified tool to high-risk per PRD §22
}

export function createPendingActionCard(
  toolName: string,
  payload: Record<string, any>,
  customTitle?: string,
  customDesc?: string,
): PendingAction {
  const p: any = payload || {};
  const safetyLevel = getToolSafetyLevel(toolName);
  const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  let title = customTitle || `Execute ${toolName.replace(/_/g, " ")}`;
  let description = customDesc || `AI requested to perform operation with payload: ${JSON.stringify(p)}`;

  if (toolName === "create_deal") {
    title = `Create New Deal: "${p.title || "Untitled Deal"}"`;
    description = `Value: ${p.value || 0} | Stage: ${p.stage || "lead"}`;
  } else if (toolName === "create_customer") {
    title = `Add New Customer: "${p.name || "Unnamed Customer"}"`;
    description = `Company: ${p.company || "N/A"} | Email: ${p.email || "N/A"}`;
  } else if (toolName === "update_deal") {
    title = `Move Deal Stage`;
    description = `Update deal stage to "${p.stage}" for deal ID ${p.dealId}`;
  } else if (toolName === "create_task") {
    title = `Create Task: "${p.title || "New Task"}"`;
    description = `Priority: ${p.priority || "Medium"}${p.dueDate ? ` | Due: ${p.dueDate}` : ""}`;
  }

  return {
    id,
    toolName,
    safetyLevel,
    title,
    description,
    payload: p,
    status: "pending",
  };
}

export async function executeTool(
  supabase: any,
  orgId: string,
  userId: string,
  toolName: string,
  payload: Record<string, any>,
): Promise<any> {
  const p: any = payload || {};
  switch (toolName) {
    case "get_customer": {
      let query = supabase.from("customers").select("*").eq("org_id", orgId);
      if (p.customerId) query = query.eq("id", p.customerId);
      else if (p.email) query = query.eq("email", p.email);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }
    case "search_customers": {
      let query = supabase.from("customers").select("*").eq("org_id", orgId);
      if (p.status) query = query.eq("status", p.status);
      if (p.query) query = query.or(`name.ilike.%${p.query}%,company.ilike.%${p.query}%`);
      const { data, error } = await query.limit(10);
      if (error) throw new Error(error.message);
      return data;
    }
    case "get_deal": {
      const { data, error } = await supabase
        .from("deals")
        .select("*, customers(name)")
        .eq("org_id", orgId)
        .eq("id", p.dealId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "search_deals": {
      let query = supabase.from("deals").select("*").eq("org_id", orgId);
      if (p.stage) query = query.eq("stage", p.stage);
      if (p.minValue) query = query.gte("value", p.minValue);
      const { data, error } = await query.order("value", { ascending: false }).limit(10);
      if (error) throw new Error(error.message);
      return data;
    }
    case "get_revenue": {
      const { data: invoices, error } = await supabase.from("invoices").select("amount, status").eq("org_id", orgId);
      if (error) throw new Error(error.message);
      let collected = 0;
      let outstanding = 0;
      (invoices || []).forEach((inv: any) => {
        if (inv.status === "paid") collected += Number(inv.amount || 0);
        else if (inv.status === "sent" || inv.status === "overdue") outstanding += Number(inv.amount || 0);
      });
      return { collected, outstanding, totalInvoices: (invoices || []).length };
    }
    case "search_knowledge_base": {
      const query: string = p.query || "";
      if (!query) return [];

      // 1. Try vector semantic search — only if GEMINI_API_KEY is configured server-side
      if (hasGeminiKey()) {
        const queryEmbedding = await generateQueryEmbedding(query);
        if (queryEmbedding) {
          try {
            const { data: vectorChunks, error: rpcErr } = await supabase.rpc(
              "match_document_chunks",
              {
                query_embedding: `[${queryEmbedding.join(",")}]`,
                match_threshold: 0.65,
                match_count: 5,
                p_org_id: orgId,
              },
            );
            if (!rpcErr && vectorChunks && vectorChunks.length > 0) {
              console.info(
                `[optera AI Tools] search_knowledge_base: match_document_chunks returned ${vectorChunks.length} semantic results`,
              );
              return vectorChunks.map((c: any) => ({
                content: c.content,
                similarity: c.similarity,
                metadata: c.metadata,
                search_type: "semantic",
              }));
            }
            if (rpcErr) {
              console.warn("[optera AI Tools] Vector search RPC error:", rpcErr.message);
            }
          } catch (rpcEx: any) {
            console.warn("[optera AI Tools] Vector search exception:", rpcEx.message);
          }
        } else {
          console.warn("[optera AI Tools] Query embedding generation failed; using keyword fallback.");
        }
      } else {
        console.warn(
          "[optera AI Tools] search_knowledge_base: GEMINI_API_KEY not configured. " +
            "Semantic RAG (match_document_chunks) is UNAVAILABLE. Using keyword fallback.",
        );
      }

      // 2. Fallback: keyword search (always org-scoped)
      const { data, error } = await supabase
        .from("document_chunks")
        .select("content, metadata")
        .eq("org_id", orgId)
        .ilike("content", `%${query}%`)
        .limit(5);
      if (error) throw new Error(error.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((c: any) => ({ ...c, search_type: "keyword", semantic_unavailable: !hasGeminiKey() }));
    }
    case "create_customer": {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          org_id: orgId,
          name: p.name,
          company: p.company || null,
          email: p.email || null,
          phone: p.phone || null,
          status: p.status || "prospect",
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "update_customer": {
      const updateData: any = {};
      if (p.status) updateData.status = p.status;
      if (p.company) updateData.company = p.company;
      if (p.email) updateData.email = p.email;
      if (p.phone) updateData.phone = p.phone;
      if (p.name) updateData.name = p.name;
      const { data, error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("org_id", orgId)
        .eq("id", p.customerId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "create_deal": {
      const { data, error } = await supabase
        .from("deals")
        .insert({
          org_id: orgId,
          title: p.title,
          value: p.value,
          stage: p.stage || "lead",
          customer_id: p.customerId || null,
          expected_close: p.expectedClose || null,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "update_deal": {
      const { data, error } = await supabase
        .from("deals")
        .update({
          ...(p.stage && { stage: p.stage }),
          ...(p.value && { value: p.value }),
        })
        .eq("org_id", orgId)
        .eq("id", p.dealId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "create_followup_task":
    case "create_task": {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          org_id: orgId,
          title: p.title,
          description: p.description || null,
          priority: p.priority || "Medium",
          status: "Todo",
          due_date: p.dueDate || null,
          customer_id: p.customerId || null,
          deal_id: p.dealId || null,
          work_type: p.workType || "customer_follow_up",
          source: "autopilot",
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "complete_task": {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          status: "Completed",
          completed_at: new Date().toISOString(),
          completed_by: userId,
          outcome_notes: p.outcomeNotes || "Completed via AI Autopilot action.",
        })
        .eq("org_id", orgId)
        .eq("id", p.taskId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "record_activity": {
      const { data, error } = await supabase
        .from("activities")
        .insert({
          org_id: orgId,
          type: p.type || "follow_up",
          title: p.title || "Autopilot Customer Action",
          description: p.description || null,
          customer_id: p.customerId || null,
          deal_id: p.dealId || null,
          lead_id: p.leadId || null,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "send_customer_email": {
      const { emailConnector } = await import("@/lib/autopilot/connectors/email.connector");
      const res = await emailConnector.execute({
        to: p.to,
        subject: p.subject,
        content: p.content || p.text || "",
        html: p.html,
        from: p.from,
      });

      if (res.blocked) {
        const err: any = new Error(res.blockedReason || "Email delivery is BLOCKED.");
        err.isBlocked = true;
        err.blockReason = res.blockedReason;
        throw err;
      }
      if (!res.success) {
        throw new Error(res.error || "Email delivery failed.");
      }

      return res.data;
    }
    default:
      throw new Error(`Unknown or unsupported tool: ${toolName}`);
  }
}
