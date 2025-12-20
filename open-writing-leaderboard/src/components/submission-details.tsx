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
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, CheckCircle2, XCircle, Loader2, Sparkles, Scale } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type SubmissionStatus = "SUBMITTED" | "QUEUED" | "STARTING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMEOUT" | "CANCELLED";

interface SubmissionData {
  id: string;
  status: SubmissionStatus;
  params: {
    modelType?: string;
    modelId?: string;
    ggufUrl?: string;
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
