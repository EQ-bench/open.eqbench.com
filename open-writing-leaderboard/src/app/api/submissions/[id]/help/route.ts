import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { vllmParamsSchema } from "@/lib/vllm-params-configurable-schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const DAILY_LIMIT = 50;
const MAX_LOG_CHARS = 100000;
const MAX_HELP_REQUESTS_PER_RUN = 3;

function hashIP(ip: string): string {
  // Simple hash - not cryptographically secure but good enough for rate limiting
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `ip_${hash.toString(16)}`;
}

async function checkRateLimit(key: string, keyType: "user" | "ip"): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Count help requests in the last 24 hours for this key
  const count = await prisma.event_log.count({
    where: {
      event_type: "help_request",
      created_at: { gte: oneDayAgo },
      details: {
        path: [keyType === "user" ? "user_id" : "ip_hash"],
        equals: key,
      },
    },
  });

  return {
    allowed: count < DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - count),
  };
}

function truncateMiddle(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const keepEachSide = Math.floor(maxLength / 2);
  const truncatedChars = text.length - maxLength;

  return (
    text.slice(0, keepEachSide) +
    `\n\n[...truncated ${truncatedChars} chars...]\n\n` +
    text.slice(-keepEachSide)
  );
}

function buildSystemPrompt(): string {
  // Build configurable options documentation
  const engineParamsDocs = Object.entries(vllmParamsSchema.engineParams)
    .map(([key, config]) => {
      let doc = `- **${config.label}** (\`${key}\`): ${config.description}`;
      if (config.type === "number") {
        const numConfig = config as { min?: number; max?: number; default: number | null };
        if (numConfig.min !== undefined && numConfig.max !== undefined) {
          doc += ` (range: ${numConfig.min}-${numConfig.max})`;
        }
        if (numConfig.default !== null) {
          doc += ` [default: ${numConfig.default}]`;
        }
      } else if (config.type === "select") {
        const selectConfig = config as { options: readonly { value: string | null; label: string }[] };
        const validOptions = selectConfig.options
          .filter(o => o.value !== null)
          .map(o => o.label)
          .join(", ");
        doc += ` (options: ${validOptions})`;
      } else if (config.type === "boolean") {
        doc += " (enable/disable flag)";
      }
      return doc;
    })
    .join("\n");

  const envVarsDocs = Object.entries(vllmParamsSchema.envVars)
    .map(([key, config]) => {
      let doc = `- **${config.label}** (\`${key}\`): ${config.description}`;
      const validOptions = config.options
        .filter(o => o.value !== null)
        .map(o => o.label)
        .join(", ");
      doc += ` (options: ${validOptions})`;
      return doc;
    })
    .join("\n");

  return `You are a helpful assistant for users submitting models to an automated LLM evaluation server (the "Open Writing Leaderboard"). The server runs models using vLLM to evaluate creative writing capabilities.

## Context
A user has submitted a model for evaluation via a web UI, but the job failed. They are seeking help to:
1. Understand what went wrong
2. Get suggestions for configuration settings they could try to fix the issue

## Hardware & Environment
- GPU: 2× NVIDIA H100 with 80GB VRAM each (160GB total)
- Backend: vLLM 0.13.0, PyTorch/CUDA 12.9
- Maximum runtime: 2 hours per evaluation
- The evaluation involves generating multi-turn creative writing samples, then having judge models score them

## Model Requirements
- **Public models only** — gated models are not supported
- **Safetensors format required** — no GGUF support
- **trust_remote_code is disabled** — only whitelisted major labs (e.g., meta-llama, mistralai, google) are allowed

## Important
The user can ONLY modify the configurable vLLM settings exposed in the UI. They cannot:
- Change the evaluation code
- Access the server directly
- Modify any other parameters
- Enable trust_remote_code

## Configurable vLLM Engine Parameters
${engineParamsDocs}

## Configurable Environment Variables
${envVarsDocs}

## Your Task
1. Analyze the error logs and extracted errors provided
2. Explain what went wrong in clear, non-technical terms where possible
3. Suggest specific configuration changes that might help, referencing ONLY the options listed above
4. If the error is not fixable via configuration (e.g., gated model, model doesn't exist), explain that clearly
5. Be concise but thorough - users want actionable advice

Do not suggest settings that aren't in the configurable options list above.`;
}

function buildUserPrompt(data: {
  modelType: string;
  modelId?: string;
  ggufUrl?: string;
  currentConfig: string;
  extractedErrors: string;
  stderrLogs: string;
  fullLogs: string;
}): string {
  return `## Submission Details
- **Model Type**: ${data.modelType}
- **Model**: ${data.modelId || data.ggufUrl || "Unknown"}

## Current Configuration
${data.currentConfig || "Default settings (no custom configuration)"}

## Extracted Errors
${data.extractedErrors || "No specific errors extracted"}

## Recent stderr Output
\`\`\`
${data.stderrLogs || "No stderr output available"}
\`\`\`

## Full Job Log (trimmed)
\`\`\`
${data.fullLogs}
\`\`\`

Please analyze the error and suggest configuration changes that might help.`;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { auth_subject: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Rate limit checks
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const ipHash = hashIP(ip);

    const userLimit = await checkRateLimit(user.id, "user");
    const ipLimit = await checkRateLimit(ipHash, "ip");

    if (!userLimit.allowed) {
      return NextResponse.json({
        error: "Daily help request limit reached. Try again tomorrow.",
      }, { status: 429 });
    }

    if (!ipLimit.allowed) {
      return NextResponse.json({
        error: "Daily help request limit reached. Try again tomorrow.",
      }, { status: 429 });
    }

    // Get submission
    const submission = await prisma.submissions.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        status: true,
        params: true,
        error_msg: true,
        run_key: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify ownership
    if (submission.user_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only allow help for failed submissions
    if (!["FAILED", "TIMEOUT", "CANCELLED"].includes(submission.status)) {
      return NextResponse.json({ error: "Help is only available for failed submissions" }, { status: 400 });
    }

    // Check per-run limit from request body
    const body = await request.json().catch(() => ({}));
    const helpRequestCount = body.helpRequestCount || 0;
    if (helpRequestCount >= MAX_HELP_REQUESTS_PER_RUN) {
      return NextResponse.json({
        error: `Maximum ${MAX_HELP_REQUESTS_PER_RUN} help requests per submission reached`,
      }, { status: 429 });
    }

    // Fetch logs
    let logs: { stream: string; data: string }[] = [];
    if (submission.run_key) {
      logs = await prisma.run_logs.findMany({
        where: { run_key: submission.run_key },
        orderBy: { id: "asc" },
        select: { stream: true, data: true },
      });
    }

    // Process logs
    const stderrLogs = logs
      .filter(l => l.stream === "stderr" || l.stream === "error")
      .map(l => l.data)
      .join("\n")
      .slice(-30000); // Last 30k chars of stderr

    const fullLogs = logs
      .map(l => `[${l.stream}] ${l.data}`)
      .join("\n");

    // Trim middle to preserve start and end of logs
    const trimmedLogs = truncateMiddle(fullLogs, MAX_LOG_CHARS);

    // Build config description
    const submissionParams = submission.params as Record<string, unknown> | null;
    const vllmParams = submissionParams?.vllmParams as { args?: { arg: string; value: unknown }[]; envVars?: Record<string, string> } | undefined;

    let currentConfig = "";
    if (vllmParams?.args?.length) {
      currentConfig += "Engine Parameters:\n";
      for (const item of vllmParams.args) {
        currentConfig += `  ${item.arg}: ${item.value === null ? "enabled" : item.value}\n`;
      }
    }
    if (vllmParams?.envVars && Object.keys(vllmParams.envVars).length) {
      currentConfig += "Environment Variables:\n";
      for (const [key, value] of Object.entries(vllmParams.envVars)) {
        currentConfig += `  ${key}: ${value}\n`;
      }
    }

    // Extract errors for summary
    const extractedErrors = submission.error_msg || "";

    // Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      modelType: (submissionParams?.modelType as string) || "unknown",
      modelId: submissionParams?.modelId as string | undefined,
      ggufUrl: submissionParams?.ggufUrl as string | undefined,
      currentConfig,
      extractedErrors,
      stderrLogs,
      fullLogs: trimmedLogs,
    });

    // Make OpenRouter API call with streaming
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json({ error: "Help feature not configured" }, { status: 503 });
    }

    const fullPrompt = systemPrompt + "\n\n---\n\n" + userPrompt;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://open.eqbench.com",
        "X-Title": "EQBench Open Writing Leaderboard",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        reasoning: {"effort": "none"},
        max_tokens: 12000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", errorText);
      return NextResponse.json({ error: "Failed to get help response" }, { status: 502 });
    }

    // Log the help request for rate limiting (don't await, fire and forget)
    prisma.event_log.create({
      data: {
        event_type: "help_request",
        submission_id: id,
        user_id: user.id,
        ip: ipHash,
        details: {
          user_id: user.id,
          ip_hash: ipHash,
        },
      },
    }).catch((err) => console.error("Failed to log help request:", err));

    // Return the prompt along with the streaming response
    // We'll use a custom format: first line is JSON with prompt, then SSE stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send the prompt first as a special message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "prompt", content: fullPrompt })}\n\n`));

        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content })}\n\n`));
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in help API:", error);
    return NextResponse.json(
      { error: "Failed to get help" },
      { status: 500 }
    );
  }
}
