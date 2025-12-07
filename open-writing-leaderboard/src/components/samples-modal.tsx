"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import prompts from "@/data/prompts.json";

interface Turn {
  turn_type: "planning" | "chapter";
  turn_index: number;
  user_prompt: string;
  assistant_response: string;
  status: string;
  chapter_number?: number | null;
}

interface Sample {
  id: number;
  prompt_id: string;
  iteration_index: number;
  aggregated_scores: Record<string, number> | null;
}

interface SampleResponse {
  model_response: string | null;
  model_responses: Turn[] | null;
}

interface SamplesModalProps {
  modelName: string | null;
  onClose: () => void;
}

const promptsData = prompts as Record<string, { category: string; prompt: string }>;

export function SamplesModal({ modelName, onClose }: SamplesModalProps) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string>("");
  const [loadedResponses, setLoadedResponses] = useState<Record<number, SampleResponse>>({});
  const [loadingResponses, setLoadingResponses] = useState<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modelName) {
      setLoading(true);
      setSamples([]);
      setExpandedItem("");
      setLoadedResponses({});
      setLoadingResponses(new Set());

      fetch(`/api/samples/${encodeURIComponent(modelName)}`)
        .then((res) => res.json())
        .then((data) => {
          setSamples(data.samples || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [modelName]);

  const loadSampleResponse = async (taskId: number) => {
    if (loadedResponses[taskId] || loadingResponses.has(taskId)) return;

    setLoadingResponses((prev) => new Set(prev).add(taskId));

    try {
      const res = await fetch(`/api/samples/response/${taskId}`);
      const data = await res.json();
      setLoadedResponses((prev) => ({
        ...prev,
        [taskId]: data,
      }));
    } catch {
      // Failed to load response
    } finally {
      setLoadingResponses((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleAccordionChange = (value: string) => {
    setExpandedItem(value);

    // Load response content when expanding
    if (value) {
      const taskId = parseInt(value, 10);
      if (!isNaN(taskId)) {
        loadSampleResponse(taskId);
      }
    }

    // Scroll to the newly expanded item
    if (value && scrollContainerRef.current) {
      setTimeout(() => {
        const element = document.getElementById(`sample-${value}`);
        if (element && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const elementTop = element.offsetTop - container.offsetTop;
          container.scrollTo({ top: elementTop - 16, behavior: "smooth" });
        }
      }, 100);
    }
  };

  const getOverallScore = (scores: Record<string, number> | null): number | null => {
    if (!scores) return null;
    // Look for common overall score keys
    const overallKeys = ["overall", "total", "score", "final_score"];
    for (const key of overallKeys) {
      if (key in scores && typeof scores[key] === "number") {
        return scores[key];
      }
    }
    // Fall back to average of all numeric scores
    const numericScores = Object.values(scores).filter(v => typeof v === "number");
    if (numericScores.length > 0) {
      return numericScores.reduce((a, b) => a + b, 0) / numericScores.length;
    }
    return null;
  };

  return (
    <Dialog open={modelName !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-100px)] max-w-[1200px] h-[calc(100vh-100px)] flex flex-col p-0 sm:max-w-[1200px]">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Writing Samples — {modelName}</DialogTitle>
        </DialogHeader>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-6"
        >
          {loading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : samples.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No writing samples available for this model.
            </div>
          ) : (
            <Accordion
              type="single"
              collapsible
              value={expandedItem}
              onValueChange={handleAccordionChange}
              className="py-4"
            >
              {samples.map((sample) => {
                const promptInfo = promptsData[sample.prompt_id];
                const score = getOverallScore(sample.aggregated_scores);

                return (
                  <AccordionItem
                    key={sample.id}
                    value={sample.id.toString()}
                    id={`sample-${sample.id}`}
                  >
                    <AccordionTrigger className="hover:no-underline py-3 px-4 rounded-lg bg-secondary transition-colors hover:bg-secondary/70 data-[state=open]:bg-secondary/80 cursor-pointer">
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center gap-3 text-left">
                          <span className="text-sm font-medium">
                            {promptInfo?.category ?? `Prompt ${sample.prompt_id}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            #{sample.prompt_id}
                          </span>
                        </div>
                        {score !== null && (
                          <span className="text-sm font-mono text-muted-foreground">
                            {score.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {/* Writing prompt */}
                        {promptInfo && (
                          <div className="rounded-lg bg-muted/50 p-4">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              WRITING PROMPT
                            </div>
                            <p className="text-sm italic">{promptInfo.prompt}</p>
                          </div>
                        )}

                        {/* Model response */}
                        <div className="space-y-3">
                          <div className="text-xs font-medium text-muted-foreground">
                            MODEL RESPONSE
                          </div>
                          {loadingResponses.has(sample.id) ? (
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-4 w-5/6" />
                            </div>
                          ) : loadedResponses[sample.id] ? (
                            <SampleContent response={loadedResponses[sample.id]} />
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Loading response...
                            </div>
                          )}
                        </div>

                        {/* Scores */}
                        {sample.aggregated_scores && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">
                              SCORES
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(sample.aggregated_scores)
                                .filter(([key]) => !key.startsWith("_"))
                                .map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs"
                                  >
                                    <span className="text-muted-foreground capitalize">
                                      {key.replace(/_/g, " ")}:
                                    </span>
                                    <span className="font-mono font-medium">
                                      {typeof value === "number" ? value.toFixed(2) : String(value)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SampleContent({ response }: { response: SampleResponse }) {
  const [planningExpanded, setPlanningExpanded] = useState(false);
  const responses = response.model_responses;
  const singleResponse = response.model_response;

  if (responses && responses.length > 0) {
    const planningTurn = responses.find(t => t.turn_type === "planning");
    const chapterTurns = responses.filter(t => t.turn_type !== "planning");

    return (
      <div className="space-y-4">
        {/* Planning section - collapsed by default */}
        {planningTurn && (
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setPlanningExpanded(!planningExpanded)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <span className="text-xs font-medium text-muted-foreground">
                Planning
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  planningExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
            {planningExpanded && (
              <div className="px-3 pb-3">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">
                  {planningTurn.assistant_response || "No response"}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Chapter sections - always visible */}
        {chapterTurns.map((turn, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="text-base font-semibold mb-3">
              Chapter {turn.chapter_number ?? turn.turn_index}
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {turn.assistant_response || "No response"}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">
      {singleResponse || "No response available"}
    </pre>
  );
}
