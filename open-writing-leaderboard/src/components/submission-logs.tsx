"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle } from "lucide-react";

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
  const stdoutContainerRef = useRef<HTMLDivElement>(null);
  const stderrContainerRef = useRef<HTMLDivElement>(null);

  const isInProgress = ["SUBMITTED", "QUEUED", "STARTING", "RUNNING"].includes(status);

  // Separate stdout and stderr logs
  const { stdoutLogs, stderrLogs, stdoutLineCount, stderrLineCount } = useMemo(() => {
    const stdout: LogEntry[] = [];
    const stderr: LogEntry[] = [];
    let stdoutLines = 0;
    let stderrLines = 0;
    for (const log of logs) {
      // Count actual lines in the data (split by newlines, filter empty)
      const lineCount = log.data.split('\n').filter(line => line.length > 0).length || 1;
      if (log.stream.toLowerCase() === "stderr" || log.stream.toLowerCase() === "error") {
        stderr.push(log);
        stderrLines += lineCount;
      } else {
        stdout.push(log);
        stdoutLines += lineCount;
      }
    }
    return { stdoutLogs: stdout, stderrLogs: stderr, stdoutLineCount: stdoutLines, stderrLineCount: stderrLines };
  }, [logs]);

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

  // Auto-scroll stdout container to bottom
  useEffect(() => {
    if (autoScroll && stdoutContainerRef.current) {
      stdoutContainerRef.current.scrollTop = stdoutContainerRef.current.scrollHeight;
    }
  }, [stdoutLogs, autoScroll]);

  // Auto-scroll stderr container to bottom
  useEffect(() => {
    if (autoScroll && stderrContainerRef.current) {
      stderrContainerRef.current.scrollTop = stderrContainerRef.current.scrollHeight;
    }
  }, [stderrLogs, autoScroll]);

  const formatTimestamp = (ts: string) => {
    // Use UTC format to avoid hydration mismatch between server and client
    const date = new Date(ts);
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <>
      {/* Stdout Logs */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Run Logs
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({stdoutLineCount} {stdoutLineCount === 1 ? "line" : "lines"})
              </span>
            </CardTitle>
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
            ref={stdoutContainerRef}
            className="bg-muted rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs"
          >
            {stdoutLogs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                {isInProgress ? "Waiting for logs..." : "No logs available"}
              </div>
            ) : (
              stdoutLogs.map((log) => (
                <div key={log.id} className="flex gap-2 py-0.5">
                  <span className="text-muted-foreground shrink-0">
                    [{formatTimestamp(log.ts)}]
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

      {/* Stderr Logs - Collapsible */}
      {stderrLogs.length > 0 && (
        <Card className="mb-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="stderr" className="border-none">
              <CardHeader className="py-0">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <CardTitle className="text-base">
                      Stderr
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({stderrLineCount} {stderrLineCount === 1 ? "line" : "lines"})
                      </span>
                    </CardTitle>
                  </div>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="pt-0">
                  <div
                    ref={stderrContainerRef}
                    className="bg-muted rounded-lg p-4 h-60 overflow-y-auto font-mono text-xs"
                  >
                    {stderrLogs.map((log) => (
                      <div key={log.id} className="flex gap-2 py-0.5">
                        <span className="text-muted-foreground shrink-0">
                          [{formatTimestamp(log.ts)}]
                        </span>
                        <span className="whitespace-pre-wrap break-all text-red-500">
                          {log.data}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      )}
    </>
  );
}
