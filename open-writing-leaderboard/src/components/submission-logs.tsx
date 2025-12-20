"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface LogEntry {
  id: number;
  ts: string;
  stream: string;
  data: string;
}

interface SubmissionLogsProps {
  submissionId: string;
  initialStatus: string;
}

export function SubmissionLogs({ submissionId, initialStatus }: SubmissionLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [status, setStatus] = useState(initialStatus);
  const containerRef = useRef<HTMLDivElement>(null);

  const isInProgress = ["SUBMITTED", "QUEUED", "STARTING", "RUNNING"].includes(status);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}/logs`);
      if (!response.ok) return;

      const data = await response.json();

      if (data.logs) {
        setLogs(data.logs);
      }

      if (data.status) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  }, [submissionId]);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh when in progress
  useEffect(() => {
    if (!isInProgress) return;

    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [isInProgress, fetchLogs]);

  // Auto-scroll logs container to bottom (not the page)
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);


  const formatTimestamp = (ts: string) => {
    // Use UTC format to avoid hydration mismatch between server and client
    const date = new Date(ts);
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const getStreamColor = (stream: string) => {
    switch (stream.toLowerCase()) {
      case "stderr":
      case "error":
        return "text-red-500";
      case "warning":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      default:
        return "text-foreground";
    }
  };


  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Run Logs</CardTitle>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoScroll"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="autoScroll" className="text-sm font-normal cursor-pointer">
              Auto-scroll
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="bg-muted rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs"
        >
          {logs.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              {isInProgress ? "Waiting for logs..." : "No logs available"}
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-2 py-0.5">
                <span className="text-muted-foreground shrink-0">
                  [{formatTimestamp(log.ts)}]
                </span>
                <span className={`shrink-0 w-16 ${getStreamColor(log.stream)}`}>
                  {log.stream}
                </span>
                <span className="whitespace-pre-wrap break-all">{log.data}</span>
              </div>
            ))
          )}
        </div>
        {isInProgress && (
          <p className="text-xs text-muted-foreground mt-2">
            Logs refresh automatically every 10 seconds
          </p>
        )}
      </CardContent>
    </Card>
  );
}
