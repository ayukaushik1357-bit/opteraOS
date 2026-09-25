import { AutopilotToolRegistry } from "./registry";
import { evaluateToolSafety, sanitizeLogPayload } from "./safety";
import { executeWithRetry, generateIdempotencyKey } from "./retry";
import { generateAICompletionWithSystemPrompt } from "@/lib/ai/ai.service";
import type {
  AutopilotGoal,
  OrchestratorStep,
  OrchestrationResult,
  ToolExecutionContext,
  ExecutionStatus,
  ConnectorResult,
} from "./types";

export class AutopilotOrchestrator {
  /**
   * Execute an end-to-end multi-step autonomous business objective
   */
  async executeGoal(
    goal: AutopilotGoal,
    supabase: any,
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const executionId = goal.goalId || crypto.randomUUID();
    const startedIso = new Date(startTime).toISOString();
    const maxSteps = goal.maxSteps || 5;

    const steps: OrchestratorStep[] = [];
    const toolsUsed: string[] = [];
    let externalApiCalls = 0;
    let finalStatus: ExecutionStatus = "completed";
    let blockedReason: string | null = null;
    let waitingApprovalAction: any = null;
    let outcomeSummary = "";

    // ── 1. Load CRM / Business Context ───────────────────────────────────────
    let customerContext: any = null;
    let dealsContext: any[] = [];
    let invoicesContext: any[] = [];
    let orgContext: any = { name: "Organization", currency: "INR" };

    try {
      const [orgRes] = await Promise.all([
        supabase.from("organizations").select("name, currency").eq("id", goal.orgId).maybeSingle(),
      ]);
      if (orgRes?.data) orgContext = orgRes.data;

      if (goal.targetEntity?.type === "customer" && goal.targetEntity.id) {
        const [custRes, dealsRes, invsRes] = await Promise.all([
          supabase.from("customers").select("*").eq("id", goal.targetEntity.id).eq("org_id", goal.orgId).maybeSingle(),
          supabase.from("deals").select("id, title, value, stage").eq("customer_id", goal.targetEntity.id).eq("org_id", goal.orgId),
          supabase.from("invoices").select("id, number, amount, status, due_date").eq("customer_id", goal.targetEntity.id).eq("org_id", goal.orgId),
        ]);
        if (custRes?.data) customerContext = custRes.data;
        if (dealsRes?.data) dealsContext = dealsRes.data;
        if (invsRes?.data) invoicesContext = invsRes.data;
      }
    } catch (ctxErr) {
      console.warn("[Autopilot] Could not fetch supplementary CRM context:", ctxErr);
    }

    // ── 2. Persist Initial Execution State in Database ───────────────────────
    try {
      await supabase.from("workflow_executions").insert({
        id: executionId,
        org_id: goal.orgId,
        workflow_id: "autopilot_orchestrator",
        trigger_event: "autopilot_goal_execution",
        status: "running",
        started_at: startedIso,
        input_payload: sanitizeLogPayload({
          goal: goal.title,
          description: goal.description,
          targetEntity: goal.targetEntity,
        }),
      });
    } catch (err) {
      console.warn("[Autopilot] Could not insert initial execution record:", err);
    }

    // ── 3. Multi-Step Autonomous ReAct Loop ──────────────────────────────────
    let stepCount = 0;
    let isFinished = false;
    const observationHistory: string[] = [];

    while (stepCount < maxSteps && !isFinished) {
      stepCount++;
      const stepStartTime = Date.now();

      // Build structured reasoning prompt with available tools and previous observations
      const availableToolsList = AutopilotToolRegistry.getAll().map(
        (t) => `- ${t.name}: ${t.description} (Risk: ${t.riskLevel})`,
      ).join("\n");

      const systemPrompt = `You are opteraOS Autopilot, an autonomous AI business operating system that controls real-world business systems through APIs.

ORGANIZATION:
- Business: ${orgContext.name} (${orgContext.currency})

${customerContext ? `CUSTOMER CONTEXT:
- Name: ${customerContext.name}
- Email: ${customerContext.email || "N/A"}
- Phone: ${customerContext.phone || "N/A"}
- Company: ${customerContext.company || "N/A"}
- Status: ${customerContext.status}
- Invoices: ${invoicesContext.map((i) => `#${i.number}: ${orgContext.currency} ${i.amount} (${i.status})`).join(", ") || "None"}
- Deals: ${dealsContext.map((d) => `${d.title} (${orgContext.currency} ${d.value}, ${d.stage})`).join(", ") || "None"}` : ""}

AVAILABLE TOOLS:
${availableToolsList}

CURRENT OBJECTIVE:
"${goal.title}" ${goal.description ? `\nDetails: ${goal.description}` : ""}

PREVIOUS STEP OBSERVATIONS:
${observationHistory.length > 0 ? observationHistory.join("\n") : "None (Starting execution)"}

INSTRUCTIONS:
1. Reason carefully about what real API action to take next to advance or complete the goal.
2. If the goal is satisfied or no further actions are needed, output:
\`\`\`finish
{"summary": "Concise summary of actions taken and verified results."}
\`\`\`
3. If an action is required, output a thought and an action block:
Thought: <Reasoning for choosing this specific tool>
\`\`\`action
{
  "toolName": "<registered_tool_name>",
  "payload": { ... }
}
\`\`\``;

      // Call AI reasoning engine
      const aiResponse = await generateAICompletionWithSystemPrompt(
        [{ role: "user", content: `Execute step ${stepCount} for the objective.` }],
        systemPrompt,
      );

      const responseText = aiResponse.content;

      // Check if finished
      const finishMatch = responseText.match(/```finish\s*([\s\S]*?)\s*```/);
      if (finishMatch && finishMatch[1]) {
        try {
          const finishData = JSON.parse(finishMatch[1]);
          outcomeSummary = finishData.summary || "Objective completed successfully.";
        } catch {
          outcomeSummary = "Objective execution completed.";
        }
        isFinished = true;
        break;
      }

      // Parse action block
      const actionMatch = responseText.match(/```action\s*([\s\S]*?)\s*```/);
      if (!actionMatch || !actionMatch[1]) {
        // If the AI didn't emit an action block and didn't finish, wrap up
        outcomeSummary = responseText.replace(/```[\s\S]*?```/g, "").trim() || "Execution finished.";
        isFinished = true;
        break;
      }

      let parsedAction: { toolName: string; payload: Record<string, any> };
      try {
        parsedAction = JSON.parse(actionMatch[1]);
      } catch (err) {
        observationHistory.push(`Step ${stepCount} Error: Invalid JSON in action block.`);
        continue;
      }

      const { toolName, payload } = parsedAction;
      const thoughtText = responseText.replace(/```[\s\S]*?```/g, "").trim() || `Executing ${toolName}`;

      const toolCtx: ToolExecutionContext = {
        supabase,
        orgId: goal.orgId,
        userId: goal.userId,
        executionId,
        stepIndex: stepCount,
        idempotencyKey: generateIdempotencyKey(goal.orgId, executionId, stepCount, toolName, payload),
        isApprovalGranted: false,
      };

      // ── 4. Safety & Schema Evaluation ──────────────────────────────────────
      const safetyResult = evaluateToolSafety(
        toolName,
        payload,
        toolCtx,
        goal.requiresApprovalForHighRisk ?? true,
      );

      if (safetyResult.requiresHumanApproval) {
        finalStatus = "waiting_approval";
        waitingApprovalAction = {
          toolName,
          payload,
          riskLevel: safetyResult.toolSpec?.riskLevel || "HIGH",
        };
        outcomeSummary = `Execution paused. Action '${safetyResult.toolSpec?.displayName}' requires human approval.`;

        steps.push({
          stepNumber: stepCount,
          thought: thoughtText,
          action: toolName,
          toolName,
          inputPayload: sanitizeLogPayload(payload),
          status: "waiting_approval",
          startedAt: new Date(stepStartTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - stepStartTime,
          observation: "Paused: Waiting for human approval.",
        });

        isFinished = true;
        break;
      }

      if (!safetyResult.allowed || !safetyResult.toolSpec) {
        const blockMsg = safetyResult.blockedReason || "Safety validation failed.";
        observationHistory.push(`Step ${stepCount} Failed: ${blockMsg}`);
        steps.push({
          stepNumber: stepCount,
          thought: thoughtText,
          action: toolName,
          toolName,
          inputPayload: sanitizeLogPayload(payload),
          status: "blocked",
          startedAt: new Date(stepStartTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - stepStartTime,
          error: blockMsg,
          observation: `Blocked: ${blockMsg}`,
        });
        continue;
      }

      // ── 5. Execute Tool via Connector & Retry Handler ──────────────────────
      toolsUsed.push(toolName);
      if (safetyResult.toolSpec.category === "communication" || safetyResult.toolSpec.category === "finance") {
        externalApiCalls++;
      }

      const executionResult: ConnectorResult = await executeWithRetry(
        async () => safetyResult.toolSpec!.execute(safetyResult.validatedPayload, toolCtx),
        { maxRetries: safetyResult.toolSpec.maxRetries ?? 2 },
      );

      const stepDuration = Date.now() - stepStartTime;
      const stepStatus: ExecutionStatus = executionResult.blocked
        ? "blocked"
        : executionResult.success
        ? "completed"
        : "failed";

      let observation = "";
      if (executionResult.blocked) {
        observation = `Action BLOCKED: ${executionResult.blockedReason}`;
        blockedReason = executionResult.blockedReason || null;
        finalStatus = "blocked";
      } else if (executionResult.success) {
        observation = `Action '${toolName}' SUCCEEDED via ${executionResult.provider}. External ID: ${executionResult.externalId || "N/A"}.`;
      } else {
        observation = `Action '${toolName}' FAILED on ${executionResult.provider}: ${executionResult.error}`;
      }

      observationHistory.push(`Step ${stepCount} Observation: ${observation}`);

      steps.push({
        stepNumber: stepCount,
        thought: thoughtText,
        action: toolName,
        toolName,
        inputPayload: sanitizeLogPayload(payload),
        result: sanitizeLogPayload(executionResult),
        status: stepStatus,
        startedAt: new Date(stepStartTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: stepDuration,
        error: executionResult.error || executionResult.blockedReason || null,
        observation,
      });

      // If an external communication or financial tool was blocked due to missing credentials, stop loop
      if (executionResult.blocked) {
        outcomeSummary = `Execution blocked: ${executionResult.blockedReason}`;
        isFinished = true;
        break;
      }
    }

    if (!outcomeSummary) {
      outcomeSummary = steps.length > 0
        ? `Executed ${steps.length} actions (${steps.map((s) => s.toolName).join(", ")}).`
        : "Autopilot analyzed the situation and determined no action was required.";
    }

    const totalDurationMs = Date.now() - startTime;
    const completedIso = new Date().toISOString();

    const orchestrationResult: OrchestrationResult = {
      executionId,
      goal: goal.title,
      status: finalStatus,
      outcomeSummary,
      steps,
      totalDurationMs,
      startedAt: startedIso,
      completedAt: completedIso,
      error: (finalStatus as string) === "failed" ? outcomeSummary : null,
      blockedReason,
      waitingApprovalAction,
      metrics: {
        stepsExecuted: steps.length,
        toolsUsed: Array.from(new Set(toolsUsed)),
        externalApiCalls,
      },
    };

    // ── 6. Update Final Execution Record in Supabase ──────────────────────────
    try {
      await supabase
        .from("workflow_executions")
        .update({
          status: finalStatus,
          completed_at: completedIso,
          duration_ms: totalDurationMs,
          error_message: blockedReason || ((finalStatus as string) === "failed" ? outcomeSummary : null),
          output_payload: sanitizeLogPayload({
            summary: outcomeSummary,
            stepsCount: steps.length,
            steps: steps.map((s) => ({
              step: s.stepNumber,
              action: s.action,
              status: s.status,
              provider: s.result?.provider,
              externalId: s.result?.externalId,
              observation: s.observation,
            })),
            metrics: orchestrationResult.metrics,
          }),
        })
        .eq("id", executionId)
        .eq("org_id", goal.orgId);
    } catch (updErr) {
      console.warn("[Autopilot] Could not update final execution record:", updErr);
    }

    return orchestrationResult;
  }
}

export const autopilotOrchestrator = new AutopilotOrchestrator();
