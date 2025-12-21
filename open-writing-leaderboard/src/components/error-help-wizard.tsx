"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Sparkles, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";

const MAX_HELP_REQUESTS_PER_RUN = 3;
const STORAGE_KEY_PREFIX = "error_help_";

interface StoredHelp {
  response: string;
  prompt: string;
  requestCount: number;
  timestamp: number;
}

interface ErrorHelpWizardProps {
  submissionId: string;
}

export function ErrorHelpWizard({ submissionId }: ErrorHelpWizardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [requestCount, setRequestCount] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  // Load cached data from localStorage
  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${submissionId}`;
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const data: StoredHelp = JSON.parse(cached);
        setResponse(data.response);
        setPrompt(data.prompt);
        setRequestCount(data.requestCount);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [submissionId]);

  // Save to localStorage when response changes
  const saveToStorage = useCallback((data: Partial<StoredHelp>) => {
    const storageKey = `${STORAGE_KEY_PREFIX}${submissionId}`;
    try {
      const existing = localStorage.getItem(storageKey);
      const current: StoredHelp = existing ? JSON.parse(existing) : {
        response: "",
        prompt: "",
        requestCount: 0,
        timestamp: Date.now(),
      };
      const updated = { ...current, ...data, timestamp: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  }, [submissionId]);

  const requestHelp = async () => {
    if (requestCount >= MAX_HELP_REQUESTS_PER_RUN) {
      setError(`Maximum ${MAX_HELP_REQUESTS_PER_RUN} help requests per submission reached`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse("");
    setPrompt("");

    try {
      const res = await fetch(`/api/submissions/${submissionId}/help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpRequestCount: requestCount }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response stream available");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      let receivedPrompt = "";

      const newCount = requestCount + 1;
      setRequestCount(newCount);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "prompt") {
                receivedPrompt = parsed.content;
                setPrompt(receivedPrompt);
              } else if (parsed.type === "content") {
                fullResponse += parsed.content;
                setResponse(fullResponse);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Save final result
      saveToStorage({
        response: fullResponse,
        prompt: receivedPrompt,
        requestCount: newCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get help");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom while loading
  useEffect(() => {
    if (isLoading && responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response, isLoading]);

  const remainingRequests = MAX_HELP_REQUESTS_PER_RUN - requestCount;
  const canRequest = remainingRequests > 0 && !isLoading;

  return (
    <div className="space-y-4">
      {/* Help Button and Status */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button
            onClick={requestHelp}
            disabled={!canRequest}
            variant={response ? "outline" : "default"}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Getting help...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {response ? "Get New Help" : "Get Help With This Error"}
              </>
            )}
          </Button>
          {remainingRequests < MAX_HELP_REQUESTS_PER_RUN && (
            <span className="ml-3 text-sm text-muted-foreground">
              {remainingRequests} request{remainingRequests !== 1 ? "s" : ""} remaining
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Response Display */}
      {(response || isLoading) && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              AI Analysis
            </h4>
            {isLoading && (
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing...
              </span>
            )}
          </div>

          <div
            ref={responseRef}
            className="p-4 max-h-[500px] overflow-y-auto prose prose-sm dark:prose-invert prose-headings:text-base prose-p:my-2 prose-li:my-0.5 max-w-none"
          >
            {response ? (
              <ReactMarkdown>{response}</ReactMarkdown>
            ) : (
              <div className="text-muted-foreground">Waiting for response...</div>
            )}
          </div>
        </div>
      )}

      {/* Prompt Display (collapsed) */}
      {prompt && (
        <Accordion type="single" collapsible className="border rounded-lg">
          <AccordionItem value="prompt" className="border-none">
            <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                {showPrompt ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                View Prompt Sent to AI
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto">
                {prompt}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
