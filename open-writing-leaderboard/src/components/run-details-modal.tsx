"use client";

import { useEffect, useState } from "react";
import { Clock, Calendar, Timer, Server, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { vllmRequiredParams } from "@/lib/vllm-params-required-schema";

interface VllmArg {
  arg: string;
  value: string | number | null;
}

interface RunConfig {
  submission_id?: string;
  params?: {
    modelType?: string;
    vllmParams?: {
      args?: VllmArg[];
      envVars?: Record<string, string>;
    };
    judges?: string[];
    modelId?: string;
  };
}

interface RunDetails {
  runKey: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  runConfig: RunConfig;
}

interface RunDetailsModalProps {
  modelName: string | null;
  onClose: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function RunDetailsModal({ modelName, onClose }: RunDetailsModalProps) {
  const [details, setDetails] = useState<RunDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (modelName) {
      setLoading(true);
      setDetails(null);
      setError(null);

      fetch(`/api/run-details/${encodeURIComponent(modelName)}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to load run details");
          }
          return res.json();
        })
        .then((data) => {
          setDetails(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [modelName]);

  const vllmParams = details?.runConfig?.params?.vllmParams;
  const judges = details?.runConfig?.params?.judges ?? [];

  return (
    <Dialog open={modelName !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-16px)] sm:w-[calc(100vw-100px)] sm:max-w-[600px] max-h-[calc(100vh-100px)] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="break-all pr-6">Run Details — {modelName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-muted-foreground">
              {error}
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Run timing info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Run Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {details.startTime && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Calendar className="h-3 w-3" />
                        Started
                      </div>
                      <div className="text-sm font-medium">
                        {formatDateTime(details.startTime)}
                      </div>
                    </div>
                  )}
                  {details.durationMinutes !== null && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Timer className="h-3 w-3" />
                        Duration
                      </div>
                      <div className="text-sm font-medium">
                        {formatDuration(details.durationMinutes)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Judges */}
              {judges.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Judge Model{judges.length > 1 ? "s" : ""}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {judges.map((judge, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium"
                      >
                        {judge}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* vLLM Parameters */}
              {(() => {
                // Filter out required args and env vars
                const requiredArgNames = new Set(vllmRequiredParams.args.map(a => a.arg));
                const requiredEnvVarKeys = new Set(Object.keys(vllmRequiredParams.envVars));

                const filteredArgs = vllmParams?.args?.filter(
                  (item) => !requiredArgNames.has(item.arg)
                ) ?? [];
                const filteredEnvVars = Object.entries(vllmParams?.envVars ?? {}).filter(
                  ([key]) => !requiredEnvVarKeys.has(key)
                );

                const hasCustomParams = filteredArgs.length > 0 || filteredEnvVars.length > 0;

                return (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      vLLM Parameters
                    </h3>

                    {!hasCustomParams ? (
                      <p className="text-sm text-muted-foreground">
                        Default vLLM parameters were used
                      </p>
                    ) : (
                      <>
                        {/* Args */}
                        {filteredArgs.length > 0 && (
                          <div className="bg-muted/30 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border/50">
                                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                                    Argument
                                  </th>
                                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                                    Value
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredArgs.map((item, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-border/30 last:border-0"
                                  >
                                    <td className="px-3 py-2 font-mono text-xs">
                                      {item.arg}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs">
                                      {item.value === null ? (
                                        <span className="text-muted-foreground italic">
                                          (flag)
                                        </span>
                                      ) : (
                                        String(item.value)
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Environment Variables */}
                        {filteredEnvVars.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">
                              Environment Variables
                            </div>
                            <div className="bg-muted/30 rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <tbody>
                                  {filteredEnvVars.map(([key, value], idx) => (
                                    <tr
                                      key={idx}
                                      className="border-b border-border/30 last:border-0"
                                    >
                                      <td className="px-3 py-2 font-mono text-xs">
                                        {key}
                                      </td>
                                      <td className="px-3 py-2 font-mono text-xs">
                                        {value}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
