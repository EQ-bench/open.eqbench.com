import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { validateHuggingFaceModel, validateGgufUrl } from "@/lib/huggingface";
import { submissionstatus } from "@/generated/prisma/client";

// Allowed vLLM parameters (whitelist for security)
// Only engine params are allowed - generation params are controlled server-side
const ALLOWED_VLLM_ENGINE_PARAMS = new Set([
  "gpu_memory_utilization",
  "max_model_len",
  "dtype",
  "quantization",
  "tokenizer",
  "tokenizer_mode",
  "enforce_eager",
  "enable_prefix_caching",
  "max_concurrent",
  "ENV_VARS",
]);

// Allowed environment variables
const ALLOWED_ENV_VARS = new Set([
  "VLLM_ATTENTION_BACKEND",
  "VLLM_USE_TRITON_FLASH_ATTN",
  "VLLM_USE_V1",
  "VLLM_DISABLE_FLASHINFER",
  "VLLM_USE_FLASHINFER_SAMPLER",
  "VLLM_USE_TRTLLM_ATTENTION",
]);

// Valid values for environment variables
const ENV_VAR_VALID_VALUES: Record<string, Set<string>> = {
  VLLM_ATTENTION_BACKEND: new Set(["FLASH_ATTN", "XFORMERS", "FLASHINFER", "TRITON_MLA"]),
  VLLM_USE_TRITON_FLASH_ATTN: new Set(["0", "1"]),
  VLLM_USE_V1: new Set(["0", "1"]),
  VLLM_DISABLE_FLASHINFER: new Set(["0", "1"]),
  VLLM_USE_FLASHINFER_SAMPLER: new Set(["0", "1"]),
  VLLM_USE_TRTLLM_ATTENTION: new Set(["0", "1"]),
};

// Allowed quantization methods (vLLM 0.11.0)
const ALLOWED_QUANTIZATION_METHODS = new Set([
  "awq",
  "gptq",
  "marlin",
  "int8",
  "fp8",
  "bitblas",
  "bitsandbytes",
  "gguf",
]);

// Judge models for evaluation
const JUDGE_MODELS = [
  "grok-4.1-fast",
  //"claude-haiku-4.5",
  //"kimi-k2-0905",
];

interface VllmEnvVars {
  VLLM_ATTENTION_BACKEND?: string;
  VLLM_USE_TRITON_FLASH_ATTN?: string;
  VLLM_USE_V1?: string;
  VLLM_DISABLE_FLASHINFER?: string;
  VLLM_USE_FLASHINFER_SAMPLER?: string;
  VLLM_USE_TRTLLM_ATTENTION?: string;
  [key: string]: string | undefined;
}

interface VllmParams {
  gpu_memory_utilization?: number;
  max_model_len?: number;
  dtype?: string;
  quantization?: string;
  tokenizer?: string;
  tokenizer_mode?: string;
  enforce_eager?: boolean;
  enable_prefix_caching?: boolean;
  max_concurrent?: number;
  ENV_VARS?: VllmEnvVars;
  [key: string]: string | number | boolean | VllmEnvVars | undefined;
}

interface SubmissionRequest {
  modelType: "huggingface" | "gguf";
  modelId?: string; // For HuggingFace models
  ggufUrl?: string; // For GGUF models
  vllmParams?: VllmParams;
  turnstileToken: string;
}

function validateAndSanitizeVllmParams(params: VllmParams | undefined): VllmParams {
  if (!params) return {};

  const sanitized: VllmParams = {};

  // Only allow whitelisted engine params - reject any generation params or unknown keys
  for (const key of Object.keys(params)) {
    if (!ALLOWED_VLLM_ENGINE_PARAMS.has(key)) {
      // Silently ignore disallowed params (could also throw an error)
      continue;
    }
  }

  // Validate gpu_memory_utilization
  if (params.gpu_memory_utilization !== undefined) {
    const val = Number(params.gpu_memory_utilization);
    if (!isNaN(val) && val >= 0.1 && val <= 1.0) {
      sanitized.gpu_memory_utilization = val;
    }
  }

  // Validate max_model_len (16k-64k range)
  if (params.max_model_len !== undefined) {
    const val = Number(params.max_model_len);
    if (Number.isInteger(val) && val >= 16384 && val <= 65536) {
      sanitized.max_model_len = val;
    }
  }

  // Validate dtype
  if (params.dtype !== undefined) {
    const allowed = ["auto", "float16", "bfloat16", "float32"];
    if (allowed.includes(params.dtype)) {
      sanitized.dtype = params.dtype;
    }
  }

  // Validate quantization (vLLM 0.11.0 supported methods)
  if (params.quantization !== undefined) {
    if (ALLOWED_QUANTIZATION_METHODS.has(params.quantization)) {
      sanitized.quantization = params.quantization;
    }
  }

  // Validate tokenizer (basic string validation - must look like a HF model ID)
  if (params.tokenizer !== undefined && typeof params.tokenizer === "string") {
    const tokenizer = params.tokenizer.trim();
    // Must contain a slash (org/model format) and only allowed characters
    if (tokenizer && /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(tokenizer)) {
      sanitized.tokenizer = tokenizer;
    }
  }

  // Validate tokenizer_mode
  if (params.tokenizer_mode !== undefined) {
    const allowed = ["auto", "slow", "mistral"];
    if (allowed.includes(params.tokenizer_mode)) {
      sanitized.tokenizer_mode = params.tokenizer_mode;
    }
  }

  // Validate enforce_eager (boolean)
  if (params.enforce_eager !== undefined) {
    if (typeof params.enforce_eager === "boolean") {
      sanitized.enforce_eager = params.enforce_eager;
    }
  }

  // Validate enable_prefix_caching (boolean)
  if (params.enable_prefix_caching !== undefined) {
    if (typeof params.enable_prefix_caching === "boolean") {
      sanitized.enable_prefix_caching = params.enable_prefix_caching;
    }
  }

  // Validate max_concurrent
  if (params.max_concurrent !== undefined) {
    const val = Number(params.max_concurrent);
    if (Number.isInteger(val) && val >= 1 && val <= 256) {
      sanitized.max_concurrent = val;
    }
  }

  // Validate ENV_VARS
  if (params.ENV_VARS !== undefined && typeof params.ENV_VARS === "object") {
    const sanitizedEnvVars: VllmEnvVars = {};
    for (const [key, value] of Object.entries(params.ENV_VARS)) {
      if (ALLOWED_ENV_VARS.has(key) && typeof value === "string") {
        const validValues = ENV_VAR_VALID_VALUES[key];
        if (validValues && validValues.has(value)) {
          sanitizedEnvVars[key] = value;
        }
      }
    }
    if (Object.keys(sanitizedEnvVars).length > 0) {
      sanitized.ENV_VARS = sanitizedEnvVars;
    }
  }

  return sanitized;
}

function generateSubmissionId(): string {
  // Generate a URL-friendly ID: timestamp + random suffix
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `sub_${timestamp}${random}`;
}

function getClientIp(request: NextRequest): string {
  // Check common headers for real IP (when behind proxy/CDN)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback (may not be accurate behind proxies)
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is banned
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
    });

    if (user?.is_banned) {
      return NextResponse.json(
        { error: "Your account has been suspended" },
        { status: 403 }
      );
    }

    // Parse request body
    const body: SubmissionRequest = await request.json();

    // Get client IP
    const clientIp = getClientIp(request);
    const ipHash = await hashIp(clientIp);

    // Verify Turnstile token
    const turnstileValid = await verifyTurnstileToken(
      body.turnstileToken,
      clientIp
    );
    if (!turnstileValid) {
      return NextResponse.json(
        { error: "CAPTCHA verification failed. Please try again." },
        { status: 400 }
      );
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit(session.user.id, ipHash);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: rateLimitResult.reason,
          resetAt: rateLimitResult.resetAt,
        },
        { status: 429 }
      );
    }

    // Validate and sanitize vLLM params
    const vllmParams = validateAndSanitizeVllmParams(body.vllmParams);

    // Validate model based on type
    let modelIdentifier: string;
    const params: {
      modelType: string;
      modelId?: string;
      ggufUrl?: string;
      modelInfo?: object;
      vllmParams?: VllmParams;
      judges: string[];
    } = {
      modelType: body.modelType,
      vllmParams: Object.keys(vllmParams).length > 0 ? vllmParams : undefined,
      judges: JUDGE_MODELS,
    };

    if (body.modelType === "huggingface") {
      if (!body.modelId) {
        return NextResponse.json(
          { error: "Model ID is required for HuggingFace models" },
          { status: 400 }
        );
      }

      const validation = await validateHuggingFaceModel(body.modelId);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      modelIdentifier = body.modelId;
      params.modelId = body.modelId;
      params.modelInfo = validation.modelInfo;
    } else if (body.modelType === "gguf") {
      if (!body.ggufUrl) {
        return NextResponse.json(
          { error: "GGUF URL is required" },
          { status: 400 }
        );
      }

      const validation = validateGgufUrl(body.ggufUrl);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      modelIdentifier = body.ggufUrl;
      params.ggufUrl = body.ggufUrl;
    } else {
      return NextResponse.json(
        { error: "Invalid model type. Must be 'huggingface' or 'gguf'" },
        { status: 400 }
      );
    }

    // Check if model already exists in leaderboard (case-insensitive)
    const existingRating = await prisma.elo_ratings.findFirst({
      where: {
        model_name: {
          equals: modelIdentifier,
          mode: "insensitive",
        },
      },
    });

    if (existingRating) {
      return NextResponse.json(
        {
          error: "This model has already been evaluated and appears on the leaderboard.",
        },
        { status: 409 }
      );
    }

    // Check for duplicate submissions (same model, not failed/cancelled)
    const existingSubmission = await prisma.submissions.findFirst({
      where: {
        params: {
          path: body.modelType === "huggingface" ? ["modelId"] : ["ggufUrl"],
          equals: modelIdentifier,
        },
        status: {
          notIn: [submissionstatus.FAILED, submissionstatus.CANCELLED],
        },
      },
    });

    if (existingSubmission) {
      const statusMessage =
        existingSubmission.status === submissionstatus.SUCCEEDED
          ? "This model has already been evaluated."
          : "This model is already in the evaluation queue.";

      return NextResponse.json(
        {
          error: statusMessage,
          existingSubmissionId: existingSubmission.id,
        },
        { status: 409 }
      );
    }

    // Create submission
    const submissionId = generateSubmissionId();
    const submission = await prisma.submissions.create({
      data: {
        id: submissionId,
        user_id: session.user.id,
        created_ip: ipHash,
        status: submissionstatus.SUBMITTED,
        params: params,
        priority_score: 0,
        attempts: 0,
        max_runtime_sec: 10800, // 3 hours default
      },
    });

    // Log the event
    await prisma.event_log.create({
      data: {
        event_type: "submission_created",
        submission_id: submission.id,
        user_id: session.user.id,
        ip: ipHash,
        details: {
          modelType: body.modelType,
          modelIdentifier,
        },
      },
    });

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      status: submission.status,
      message: "Model submitted for evaluation",
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// GET: List submissions for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const [submissions, total] = await Promise.all([
      prisma.submissions.findMany({
        where: { user_id: session.user.id },
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          status: true,
          params: true,
          created_at: true,
          started_at: true,
          finished_at: true,
          error_msg: true,
          run_key: true,
        },
      }),
      prisma.submissions.count({
        where: { user_id: session.user.id },
      }),
    ]);

    return NextResponse.json({
      submissions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
