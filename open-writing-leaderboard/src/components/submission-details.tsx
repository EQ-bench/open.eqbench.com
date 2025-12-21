"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, CheckCircle2, XCircle, Loader2, Sparkles, Scale, Settings2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  vllmParamsSchema,
  type VllmParams,
  type VllmArg,
  type ConfigurableEngineParamKey,
} from "@/lib/vllm-params-configurable-schema";
import { vllmRequiredParams } from "@/lib/vllm-params-required-schema";

type SubmissionStatus = "SUBMITTED" | "QUEUED" | "STARTING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMEOUT" | "CANCELLED";

interface SubmissionData {
  id: string;
  status: SubmissionStatus;
  params: {
    modelType?: string;
    modelId?: string;
    ggufUrl?: string;
    vllmParams?: VllmParams;
  } | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error_msg: string | null;
  run_key: string | null;
}

interface GenerationProgress {
  total_tasks: number;
  total_turns: number;
  completed_turns: number;
  tasks_by_status?: {
    initialized?: number;
    generating?: number;
    generated?: number;
    error?: number;
  };
}

interface JudgingProgress {
  rubric: {
    total_tasks: number;
    completed_tasks: number;
    error_tasks: number;
  };
  elo: {
    current_stage: number;
    total_stages: number;
    comparisons_completed: number;
  };
}

interface RunInfo {
  run_key: string;
  test_model: string | null;
  status: string | null;
  start_time: string | null;
  end_time: string | null;
  results: unknown;
  generation_progress: GenerationProgress | null;
  judging_progress: JudgingProgress | null;
}

interface SubmissionDetailsProps {
  initialSubmission: SubmissionData;
  initialRunInfo: RunInfo | null;
}

function getStatusIcon(status: SubmissionStatus) {
  switch (status) {
    case "SUCCEEDED":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "FAILED":
    case "TIMEOUT":
    case "CANCELLED":
      return <XCircle className="h-5 w-5 text-destructive" />;
    case "RUNNING":
    case "STARTING":
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStatusBadgeVariant(status: SubmissionStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "SUCCEEDED":
      return "default";
    case "RUNNING":
    case "STARTING":
    case "QUEUED":
      return "secondary";
    case "FAILED":
    case "TIMEOUT":
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: SubmissionStatus): string {
  switch (status) {
    case "SUBMITTED":
      return "Submitted";
    case "QUEUED":
      return "Queued";
    case "STARTING":
      return "Starting";
    case "RUNNING":
      return "Running";
    case "SUCCEEDED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "TIMEOUT":
      return "Timed Out";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function getStatusDescription(status: SubmissionStatus): string {
  switch (status) {
    case "SUBMITTED":
      return "Your submission has been received and is waiting to be queued.";
    case "QUEUED":
      return "Your model is in the evaluation queue. It will start soon.";
    case "STARTING":
      return "The evaluation environment is being prepared.";
    case "RUNNING":
      return "Your model is currently being evaluated. This may take up to 2 hours.";
    case "SUCCEEDED":
      return "Evaluation completed successfully! Results are now on the leaderboard.";
    case "FAILED":
      return "The evaluation encountered an error. See details below.";
    case "TIMEOUT":
      return "The evaluation exceeded the maximum allowed time.";
    case "CANCELLED":
      return "This submission was cancelled.";
    default:
      return "";
  }
}

// Get label for an arg from the schema
function getArgLabel(arg: string): string {
  for (const [, config] of Object.entries(vllmParamsSchema.engineParams)) {
    if (config.arg === arg) {
      return config.label;
    }
  }
  // Fallback: convert --kebab-case to Title Case
  return arg.replace(/^--/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// Format arg value for display
function formatArgValue(arg: string, value: string | number | null): string {
  if (value === null) {
    return "Enabled";
  }

  // For select types, try to get the option label
  for (const [, config] of Object.entries(vllmParamsSchema.engineParams)) {
    if (config.arg === arg && config.type === "select") {
      const option = config.options.find(opt => opt.value === value);
      if (option) {
        return option.label;
      }
    }
  }

  return String(value);
}

// Get label for env var from schema
function getEnvVarLabel(key: string): string {
  const schema = vllmParamsSchema.envVars;
  if (key in schema) {
    return (schema as Record<string, { label?: string }>)[key]?.label || key;
  }
  return key;
}

// Format env var value for display
function formatEnvVarValue(key: string, value: string): string {
  const schema = vllmParamsSchema.envVars;
  if (key in schema) {
    const config = (schema as Record<string, { options?: readonly { value: string | null; label: string }[] }>)[key];
    if (config?.options) {
      const option = config.options.find(opt => opt.value === value);
      if (option) {
        return option.label;
      }
    }
  }
  return value;
}

// Legacy key mapping for old submissions
const legacyKeyMapping: Record<string, ConfigurableEngineParamKey> = {
  gpu_memory_utilization: "gpu-memory-utilization",
  max_model_len: "max-model-len",
  dtype: "dtype",
  quantization: "quantization",
  kv_cache_dtype: "kv-cache-dtype",
  tokenizer: "tokenizer",
  tokenizer_mode: "tokenizer-mode",
  enforce_eager: "enforce-eager",
  enable_prefix_caching: "enable-prefix-caching",
  max_num_seqs: "max-num-seqs",
  max_num_batched_tokens: "max-num-batched-tokens",
  max_parallel_loading_workers: "max-parallel-loading-workers",
  enable_expert_parallel: "enable-expert-parallel",
  disable_custom_all_reduce: "disable-custom-all-reduce",
};

function getLegacyParamLabel(key: string): string {
  const newKey = legacyKeyMapping[key];
  if (newKey && newKey in vllmParamsSchema.engineParams) {
    return vllmParamsSchema.engineParams[newKey].label;
  }
  // Fallback
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatLegacyParamValue(key: string, value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  const newKey = legacyKeyMapping[key];
  if (newKey && newKey in vllmParamsSchema.engineParams) {
    const config = vllmParamsSchema.engineParams[newKey];
    if (config.type === "select") {
      const option = config.options.find(opt => opt.value === value);
      if (option) {
        return option.label;
      }
    }
  }

  return String(value);
}

export function SubmissionDetails({ initialSubmission, initialRunInfo }: SubmissionDetailsProps) {
  const [submission, setSubmission] = useState(initialSubmission);
  const [runInfo, setRunInfo] = useState(initialRunInfo);

  const isInProgress = ["SUBMITTED", "QUEUED", "STARTING", "RUNNING"].includes(submission.status);

  const fetchSubmission = useCallback(async () => {
    try {
      const response = await fetch(`/api/submissions/${submission.id}`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.submission) {
        setSubmission(data.submission);
      }
      if (data.runInfo !== undefined) {
        setRunInfo(data.runInfo);
      }
    } catch (error) {
      console.error("Failed to fetch submission:", error);
    }
  }, [submission.id]);

  // Auto-refresh when in progress
  useEffect(() => {
    if (!isInProgress) return;

    const interval = setInterval(fetchSubmission, 5000);
    return () => clearInterval(interval);
  }, [isInProgress, fetchSubmission]);

  const submissionParams = submission.params;
  const vllmParams = submissionParams?.vllmParams;

  // Determine if we have new format (args array) or legacy format
  const hasNewFormat = vllmParams?.args !== undefined;
  const hasLegacyFormat = !hasNewFormat && vllmParams && Object.keys(vllmParams).some(k => k !== "ENV_VARS" && k !== "args" && k !== "envVars");

  return (
    <>
      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(submission.status)}
              <div>
                <CardTitle className="flex items-center gap-2">
                  Submission Status
                  <Badge variant={getStatusBadgeVariant(submission.status)}>
                    {getStatusLabel(submission.status)}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {getStatusDescription(submission.status)}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

      </Card>

      {/* Progress Card - show when we have progress data */}
      {runInfo && (runInfo.generation_progress || runInfo.judging_progress) && (() => {
        const genProgress = runInfo.generation_progress;
        const judgingProgress = runInfo.judging_progress;

        // Determine completion states
        const generationComplete = genProgress &&
          genProgress.completed_turns >= genProgress.total_turns;
        const rubricComplete = judgingProgress &&
          judgingProgress.rubric.completed_tasks >= judgingProgress.rubric.total_tasks;
        // ELO is complete when the task is succeeded (all judging done)
        const eloComplete = submission.status === "SUCCEEDED";

        return (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Evaluation Progress</CardTitle>
              <CardDescription>
                {isInProgress ? "Real-time progress of your model evaluation" : "Evaluation completed"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Generation Progress */}
              {genProgress && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {generationComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="text-sm font-medium">Generation</span>
                    {generationComplete && (
                      <Badge variant="outline" className="text-green-600 border-green-600/30 text-xs">
                        Complete
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Turns completed</span>
                      <span className="font-mono">
                        {genProgress.completed_turns} / {genProgress.total_turns}
                      </span>
                    </div>
                    <div className="relative">
                      <Progress
                        value={(genProgress.completed_turns / genProgress.total_turns) * 100}
                        className={`h-2 ${generationComplete ? '[&>div]:bg-green-500' : ''} ${!generationComplete ? '[&>div]:animate-pulse' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Task status breakdown */}
                  {genProgress.tasks_by_status && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {genProgress.tasks_by_status.generating !== undefined &&
                       genProgress.tasks_by_status.generating > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {genProgress.tasks_by_status.generating} generating
                        </Badge>
                      )}
                      {genProgress.tasks_by_status.generated !== undefined &&
                       genProgress.tasks_by_status.generated > 0 && (
                        <Badge variant="outline" className="gap-1 text-green-600 border-green-600/30">
                          <CheckCircle2 className="h-3 w-3" />
                          {genProgress.tasks_by_status.generated} completed
                        </Badge>
                      )}
                      {genProgress.tasks_by_status.error !== undefined &&
                       genProgress.tasks_by_status.error > 0 && (
                        <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                          <XCircle className="h-3 w-3" />
                          {genProgress.tasks_by_status.error} errors
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Judging Progress */}
              {judgingProgress && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {rubricComplete && eloComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Scale className="h-4 w-4 text-purple-500" />
                    )}
                    <span className="text-sm font-medium">Judging</span>
                    {rubricComplete && eloComplete && (
                      <Badge variant="outline" className="text-green-600 border-green-600/30 text-xs">
                        Complete
                      </Badge>
                    )}
                  </div>

                  {/* Rubric judging */}
                  <div className="space-y-2 pl-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rubric scoring</span>
                      <span className="font-mono">
                        {judgingProgress.rubric.completed_tasks} / {judgingProgress.rubric.total_tasks}
                      </span>
                    </div>
                    <div className="relative">
                      <Progress
                        value={(judgingProgress.rubric.completed_tasks / judgingProgress.rubric.total_tasks) * 100}
                        className={`h-2 ${rubricComplete ? '[&>div]:bg-green-500' : ''} ${!rubricComplete ? '[&>div]:animate-pulse' : ''}`}
                      />
                    </div>
                    {judgingProgress.rubric.error_tasks > 0 && (
                      <Badge variant="outline" className="gap-1 text-destructive border-destructive/30 text-xs">
                        <XCircle className="h-3 w-3" />
                        {judgingProgress.rubric.error_tasks} errors
                      </Badge>
                    )}
                  </div>

                  {/* ELO comparisons */}
                  <div className="space-y-2 pl-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ELO comparisons</span>
                      <span className="font-mono">
                        {eloComplete
                          ? `${judgingProgress.elo.total_stages} stages complete`
                          : `Processing stage ${judgingProgress.elo.current_stage} of ${judgingProgress.elo.total_stages}`
                        }
                      </span>
                    </div>
                    <div className="relative">
                      <Progress
                        value={eloComplete
                          ? 100
                          : judgingProgress.elo.total_stages > 0
                            ? ((judgingProgress.elo.current_stage - 1) / judgingProgress.elo.total_stages) * 100
                            : 0
                        }
                        className={`h-2 ${eloComplete ? '[&>div]:bg-green-500' : ''} ${!eloComplete ? '[&>div]:animate-pulse' : ''}`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {judgingProgress.elo.comparisons_completed} comparisons completed
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Model Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Model Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Model Type
              </dt>
              <dd className="mt-1">
                {submissionParams?.modelType === "huggingface"
                  ? "Hugging Face Model"
                  : "GGUF File"}
              </dd>
            </div>

            {submissionParams?.modelId && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Model ID
                </dt>
                <dd className="mt-1 flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm">
                    {submissionParams.modelId}
                  </code>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={`https://huggingface.co/${submissionParams.modelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </dd>
              </div>
            )}

            {submissionParams?.ggufUrl && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  GGUF URL
                </dt>
                <dd className="mt-1">
                  <code className="bg-muted px-2 py-1 rounded text-sm break-all">
                    {submissionParams.ggufUrl}
                  </code>
                </dd>
              </div>
            )}
          </dl>

          {/* Run Configuration - Expandable */}
          {vllmParams && (hasNewFormat || hasLegacyFormat) && (
            <div className="mt-4 border rounded-lg">
              <Accordion type="single" collapsible>
                <AccordionItem value="run-config" className="border-none">
                  <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Run Configuration</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <dl className="space-y-3">
                    {/* New format: args array (filter out required args) */}
                    {hasNewFormat && vllmParams.args && (() => {
                      const requiredArgNames = new Set(vllmRequiredParams.args.map(a => a.arg));
                      return (vllmParams.args as VllmArg[])
                        .filter(item => !requiredArgNames.has(item.arg))
                        .map((item) => (
                          <div key={item.arg} className="flex justify-between items-start gap-4">
                            <dt className="text-sm text-muted-foreground">
                              {getArgLabel(item.arg)}
                            </dt>
                            <dd className="text-sm font-mono text-right">
                              {formatArgValue(item.arg, item.value)}
                            </dd>
                          </div>
                        ));
                    })()}

                    {/* Legacy format: flat object */}
                    {hasLegacyFormat && Object.entries(vllmParams)
                      .filter(([key]) => key !== "ENV_VARS" && key !== "args" && key !== "envVars" && legacyKeyMapping[key])
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start gap-4">
                          <dt className="text-sm text-muted-foreground">
                            {getLegacyParamLabel(key)}
                          </dt>
                          <dd className="text-sm font-mono text-right">
                            {formatLegacyParamValue(key, value)}
                          </dd>
                        </div>
                      ))}

                    {/* Environment variables - new format (filter out required env vars) */}
                    {hasNewFormat && vllmParams.envVars && (() => {
                      const requiredEnvVarKeys = new Set(Object.keys(vllmRequiredParams.envVars));
                      const filteredEnvVars = Object.entries(vllmParams.envVars as Record<string, string>)
                        .filter(([key]) => !requiredEnvVarKeys.has(key));

                      if (filteredEnvVars.length === 0) return null;

                      return (
                        <>
                          <div className="border-t pt-3 mt-3">
                            <dt className="text-sm font-medium text-muted-foreground mb-2">
                              Environment Variables
                            </dt>
                          </div>
                          {filteredEnvVars.map(([key, value]) => (
                            <div key={key} className="flex justify-between items-start gap-4">
                              <dt className="text-sm text-muted-foreground">
                                {getEnvVarLabel(key)}
                              </dt>
                              <dd className="text-sm font-mono text-right">
                                {formatEnvVarValue(key, value)}
                              </dd>
                            </div>
                          ))}
                        </>
                      );
                    })()}

                    {/* Environment variables - legacy format (filter out required env vars) */}
                    {hasLegacyFormat && vllmParams.ENV_VARS && (() => {
                      const requiredEnvVarKeys = new Set(Object.keys(vllmRequiredParams.envVars));
                      const filteredEnvVars = Object.entries(vllmParams.ENV_VARS)
                        .filter(([key, value]) => value !== undefined && value !== "" && !requiredEnvVarKeys.has(key));

                      if (filteredEnvVars.length === 0) return null;

                      return (
                        <>
                          <div className="border-t pt-3 mt-3">
                            <dt className="text-sm font-medium text-muted-foreground mb-2">
                              Environment Variables
                            </dt>
                          </div>
                          {filteredEnvVars.map(([key, value]) => (
                            <div key={key} className="flex justify-between items-start gap-4">
                              <dt className="text-sm text-muted-foreground">
                                {getEnvVarLabel(key)}
                              </dt>
                              <dd className="text-sm font-mono text-right">
                                {formatEnvVarValue(key, value as string)}
                              </dd>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Error Card */}
      {submission.error_msg && (
        <Card className="mb-6 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              {submission.error_msg}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Results Card */}
      {runInfo?.results && submission.status === "SUCCEEDED" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              View the full results on the leaderboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">View on Leaderboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
