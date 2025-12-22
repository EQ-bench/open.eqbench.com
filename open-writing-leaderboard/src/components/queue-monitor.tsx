"use client";

import { useState, useEffect } from "react";
import { Timer, Loader2, CheckCircle2, XCircle, Clock, PauseCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface SubmissionParams {
  modelType: string;
  modelId?: string;
  ggufUrl?: string;
}

interface QueuedSubmission {
  id: string;
  status: string;
  params: SubmissionParams;
  created_at: string;
  started_at?: string;
  priority_score: number;
}

interface RecentSubmission {
  id: string;
  status: string;
  params: SubmissionParams;
  created_at: string;
  finished_at?: string;
}

interface QueueData {
  queued: QueuedSubmission[];
  recent: RecentSubmission[];
}

function getModelName(params: SubmissionParams): string {
  if (params.modelId) {
    // Extract just the model name from org/model format
    const parts = params.modelId.split("/");
    return parts.length > 1 ? parts[1] : params.modelId;
  }
  if (params.ggufUrl) {
    // Extract filename from URL
    const url = params.ggufUrl;
    const filename = url.split("/").pop() || url;
    // Truncate if too long
    return filename.length > 30 ? filename.slice(0, 27) + "..." : filename;
  }
  return "Unknown";
}

function getStatusBadge(status: string, priorityScore?: number) {
  // priority_score -1 means held due to rate limiting
  if (priorityScore === -1) {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-yellow-600 border-yellow-600 cursor-help"
        title="Rate limited - limits reset over a rolling 24h period"
      >
        <PauseCircle className="h-3 w-3" />
        Held
      </Badge>
    );
  }

  switch (status) {
    case "SUBMITTED":
    case "QUEUED":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Queued
        </Badge>
      );
    case "STARTING":
    case "RUNNING":
      return (
        <Badge variant="default" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    case "SUCCEEDED":
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </Badge>
      );
    case "FAILED":
    case "TIMEOUT":
    case "CANCELLED":
      return (
        <Badge variant="outline" className="gap-1 text-red-600 border-red-600">
          <XCircle className="h-3 w-3" />
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function QueueMonitor() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchQueue();
      // Refresh every 30 seconds while open
      const interval = setInterval(fetchQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [open]);

  async function fetchQueue() {
    setLoading(true);
    try {
      const res = await fetch("/api/queue");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch queue:", error);
    } finally {
      setLoading(false);
    }
  }

  const queueCount = data?.queued?.length || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 relative"
          title="View submission queue"
        >
          <Timer className="h-4 w-4" />
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {queueCount > 9 ? "9+" : queueCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Submission Queue
            {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Queued/Running Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              In Queue ({data?.queued?.length || 0})
            </h3>
            {data?.queued && data.queued.length > 0 ? (
              <div className="space-y-2">
                {data.queued.map((submission, index) => {
                  // Count non-held items before this one to get actual queue position
                  const isHeld = submission.priority_score === -1;
                  const queuePosition = isHeld
                    ? null
                    : data.queued
                        .slice(0, index)
                        .filter((s) => s.priority_score !== -1).length + 1;

                  return (
                    <div
                      key={submission.id}
                      className={`flex items-center justify-between p-2 rounded-md ${
                        isHeld ? "bg-yellow-500/10" : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-4">
                          {queuePosition !== null ? `${queuePosition}.` : "-"}
                        </span>
                        <span className="text-sm truncate">
                          {getModelName(submission.params)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusBadge(submission.status, submission.priority_score)}
                        <Link
                          href={`/submissions/${submission.id}`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="View submission details"
                          onClick={() => setOpen(false)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No submissions in queue</p>
            )}
          </div>

          {/* Recently Completed Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Recently Completed
            </h3>
            {data?.recent && data.recent.length > 0 ? (
              <div className="space-y-2">
                {data.recent.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm truncate">
                        {getModelName(submission.params)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {submission.finished_at && formatTime(submission.finished_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(submission.status)}
                      <Link
                        href={`/submissions/${submission.id}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="View submission details"
                        onClick={() => setOpen(false)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent submissions</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
