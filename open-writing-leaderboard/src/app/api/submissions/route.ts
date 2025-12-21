import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { validateHuggingFaceModel, validateGgufUrl } from "@/lib/huggingface";
import { submissionstatus, Prisma } from "@/generated/prisma/client";
import {
  validateAndSanitizeVllmArgs,
  type VllmArgsOutput,
} from "@/lib/vllm-params-configurable-schema";
import { mergeWithRequiredParams } from "@/lib/vllm-params-required-schema";

// Judge models for evaluation
const JUDGE_MODELS = [
  "grok-4.1-fast",
  //"claude-haiku-4.5",
  //"kimi-k2-0905",
];

interface SubmissionRequest {
  modelType: "huggingface" | "gguf";
  modelId?: string; // For HuggingFace models
  ggufUrl?: string; // For GGUF models
  vllmParams?: VllmArgsOutput;
  turnstileToken: string;
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

    // Look up user by auth_subject (session.user.id is the HF provider ID)
    const user = await prisma.users.findUnique({
      where: { auth_subject: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.is_banned) {
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

    // Check rate limits (use user.id which is the DB primary key)
    const rateLimitResult = await checkRateLimit(user.id, ipHash);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: rateLimitResult.reason,
          resetAt: rateLimitResult.resetAt,
        },
        { status: 429 }
      );
    }

    // Validate and sanitize user-configurable vLLM params, then merge with required params
    const userVllmParams = validateAndSanitizeVllmArgs(body.vllmParams);
    const vllmParams = mergeWithRequiredParams(userVllmParams);

    // Validate model based on type
    let modelIdentifier: string;
    // Build params object for Prisma JSON field
    const params = {
      modelType: body.modelType,
      vllmParams: Object.keys(vllmParams).length > 0 ? vllmParams : undefined,
      judges: JUDGE_MODELS,
    } as Record<string, unknown>;

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

      const normalizedModelId = validation.normalizedModelId!;
      modelIdentifier = normalizedModelId;
      params.modelId = normalizedModelId;
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
        user_id: user.id,
        created_ip: ipHash,
        status: submissionstatus.SUBMITTED,
        params: params as Prisma.InputJsonValue,
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
        user_id: user.id,
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

    // Look up user by auth_subject to get their DB id
    const user = await prisma.users.findUnique({
      where: { auth_subject: session.user.id },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const [submissions, total] = await Promise.all([
      prisma.submissions.findMany({
        where: { user_id: user.id },
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
        where: { user_id: user.id },
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
