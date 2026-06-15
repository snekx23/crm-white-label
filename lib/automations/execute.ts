import type { SupabaseClient } from "@supabase/supabase-js";

type Block = {
  id: string;
  type: string;
  data: {
    kind?: string;
    config?: Record<string, unknown>;
  };
};

type Connection = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

type FlowConfig = {
  blocks: Block[];
  connections: Connection[];
};

function findNextBlocks(
  blockId: string,
  connections: Connection[],
  blocks: Block[],
  handle?: string,
): Block[] {
  return connections
    .filter((c) => c.source === blockId && (!handle || c.sourceHandle === handle))
    .map((c) => blocks.find((b) => b.id === c.target))
    .filter(Boolean) as Block[];
}

function interpolate(template: string, lead: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(lead[key] ?? ""));
}

export async function processExecution(
  supabase: SupabaseClient,
  executionId: string,
): Promise<void> {
  const { data: execution } = await supabase
    .from("automation_executions")
    .select("*, automation_versions(config)")
    .eq("id", executionId)
    .single();

  if (!execution || execution.status !== "running") return;

  const config = (execution.automation_versions as { config: FlowConfig } | null)?.config;
  if (!config) return;

  const { blocks, connections } = config;
  const tenantId = execution.tenant_id as string;
  const leadId = execution.lead_id as string | null;

  // Fetch lead data for interpolation
  let lead: Record<string, unknown> = {};
  if (leadId) {
    const { data: leadRow } = await supabase.from("leads").select("*").eq("id", leadId).single();
    if (leadRow) lead = leadRow as Record<string, unknown>;
  }

  // Find the trigger block (starting point)
  const triggerBlock = blocks.find((b) => b.type === "trigger");
  if (!triggerBlock) {
    await supabase
      .from("automation_executions")
      .update({ status: "failed", error_message: "No trigger block", finished_at: new Date().toISOString() })
      .eq("id", executionId);
    return;
  }

  // BFS walk the flow
  const visited = new Set<string>();
  const queue: Block[] = findNextBlocks(triggerBlock.id, connections, blocks);

  while (queue.length > 0) {
    const block = queue.shift()!;
    if (visited.has(block.id)) continue;
    visited.add(block.id);

    const kind = block.data.kind ?? block.type;
    const blockConfig = block.data.config ?? {};

    // Record the step
    const { data: step } = await supabase
      .from("automation_execution_steps")
      .insert({
        execution_id: executionId,
        tenant_id: tenantId,
        block_id: block.id,
        block_type: kind,
        status: "running",
        input_payload: { lead_id: leadId, config: blockConfig },
      })
      .select("id")
      .single();

    try {
      let result: Record<string, unknown> = {};

      if (kind === "send_message" && leadId) {
        const message = interpolate(String(blockConfig.message ?? ""), lead);
        // Queue the message for WhatsApp send (insert as outbound pending)
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("lead_id", leadId)
          .in("channel", ["whatsapp", "instagram"])
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (conv) {
          await supabase.from("messages").insert({
            tenant_id: tenantId,
            conversation_id: conv.id,
            direction: "outbound",
            body: message,
            status: "pending",
          });
        }
        result = { message_queued: true, message };
      } else if (kind === "move_stage" && leadId) {
        const stageId = String(blockConfig.stage_id ?? "");
        if (stageId) {
          await supabase
            .from("leads")
            .update({ stage_id: stageId })
            .eq("id", leadId)
            .eq("tenant_id", tenantId);
          result = { stage_id: stageId };
        }
      } else if (kind === "assign_lead" && leadId) {
        const userId = String(blockConfig.user_id ?? "");
        if (userId) {
          await supabase
            .from("leads")
            .update({ assigned_to: userId })
            .eq("id", leadId)
            .eq("tenant_id", tenantId);
          result = { assigned_to: userId };
        }
      } else if (kind === "create_task" && leadId) {
        const title = interpolate(String(blockConfig.title ?? "Tarefa automática"), lead);
        const dueDays = Number(blockConfig.due_days ?? 0);
        const dueAt = dueDays > 0
          ? new Date(Date.now() + dueDays * 86400000).toISOString()
          : null;
        await supabase.from("tasks").insert({
          tenant_id: tenantId,
          lead_id: leadId,
          title,
          due_at: dueAt,
          status: "open",
        });
        result = { task_created: true };
      } else if (kind === "add_tag" && leadId) {
        const tag = String(blockConfig.tag ?? "");
        if (tag) {
          const { data: currentLead } = await supabase
            .from("leads")
            .select("tags")
            .eq("id", leadId)
            .single();
          const tags = (currentLead as { tags?: string[] } | null)?.tags ?? [];
          if (!tags.includes(tag)) {
            await supabase
              .from("leads")
              .update({ tags: [...tags, tag] })
              .eq("id", leadId)
              .eq("tenant_id", tenantId);
          }
          result = { tag_added: tag };
        }
      } else if (kind === "log_activity" && leadId) {
        const message = interpolate(String(blockConfig.message ?? "Acao automatica"), lead);
        await supabase.from("lead_activities").insert({
          tenant_id: tenantId,
          lead_id: leadId,
          kind: "automation",
          payload: { message },
        });
        result = { logged: true };
      } else if (kind === "wait") {
        const minutes = Number(blockConfig.minutes ?? 60);
        const resumeAt = new Date(Date.now() + minutes * 60000).toISOString();
        if (step) {
          await supabase
            .from("automation_execution_steps")
            .update({ status: "waiting", resume_at: resumeAt })
            .eq("id", step.id);
        }
        // Stop processing this branch until resumed
        continue;
      } else if (kind === "condition" && leadId) {
        const field = String(blockConfig.field ?? "");
        const operator = String(blockConfig.operator ?? "eq");
        const value = blockConfig.value;
        const leadValue = lead[field];

        let conditionMet = false;
        if (operator === "eq") conditionMet = leadValue === value;
        else if (operator === "neq") conditionMet = leadValue !== value;
        else if (operator === "contains") conditionMet = String(leadValue).includes(String(value));
        else if (operator === "gt") conditionMet = Number(leadValue) > Number(value);
        else if (operator === "lt") conditionMet = Number(leadValue) < Number(value);

        // Follow "yes" or "no" handle
        const nextHandle = conditionMet ? "yes" : "no";
        const nextBlocks = findNextBlocks(block.id, connections, blocks, nextHandle);
        queue.push(...nextBlocks.filter((b) => !visited.has(b.id)));

        if (step) {
          await supabase
            .from("automation_execution_steps")
            .update({ status: "done", result_payload: { condition_met: conditionMet } })
            .eq("id", step.id);
        }
        continue;
      }

      if (step) {
        await supabase
          .from("automation_execution_steps")
          .update({ status: "done", result_payload: result })
          .eq("id", step.id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (step) {
        await supabase
          .from("automation_execution_steps")
          .update({ status: "failed", error: errorMsg })
          .eq("id", step.id);
      }
      await supabase
        .from("automation_executions")
        .update({ status: "failed", error_message: errorMsg, finished_at: new Date().toISOString() })
        .eq("id", executionId);
      return;
    }

    // Queue next blocks
    const nextBlocks = findNextBlocks(block.id, connections, blocks);
    queue.push(...nextBlocks.filter((b) => !visited.has(b.id)));
  }

  await supabase
    .from("automation_executions")
    .update({ status: "completed", finished_at: new Date().toISOString() })
    .eq("id", executionId);
}
