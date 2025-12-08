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
import { ExternalLink, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

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

interface RunInfo {
  run_key: string;
  test_model: string | null;
  status: string | null;
  start_time: string | null;
  end_time: string | null;
  results: unknown;
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
      return "Your model is currently being evaluated. This may take 1-3 hours.";
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDuration(startStr: string | null, endStr: string | null): string {
  if (!startStr) return "-";
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  const durationMs = end.getTime() - start.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
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
        {isInProgress && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page automatically updates every 5 seconds.
            </p>
          </CardContent>
        )}
      </Card>

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

      {/* Timeline Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-muted-foreground">
                Submitted
              </dt>
              <dd className="text-sm">{formatDate(submission.created_at)}</dd>
            </div>

            {submission.started_at && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">
                  Started
                </dt>
                <dd className="text-sm">{formatDate(submission.started_at)}</dd>
              </div>
            )}

            {submission.finished_at && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">
                  Finished
                </dt>
                <dd className="text-sm">
                  {formatDate(submission.finished_at)}
                </dd>
              </div>
            )}

            {submission.started_at && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">
                  Duration
                </dt>
                <dd className="text-sm">
                  {formatDuration(
                    submission.started_at,
                    submission.finished_at
                  )}
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
