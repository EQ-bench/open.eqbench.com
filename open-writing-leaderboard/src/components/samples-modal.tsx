"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown, ChevronRight, Trophy } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface JudgeResult {
  judge_model_name: string;
  judge_order_index: number;
  judge_scores: Record<string, number | string> | null;
  raw_judge_text: string | null;
}

interface MatchupSummary {
  opponent: string;
  matchupCount: number;
  winsForModel: number;
  winsForOpponent: number;
  avgFractionForModel: number;
}

interface MatchupDetail {
  id: number;
  item_id: string;
  isModelA: boolean;
  fractionForModel: number | null;
  plusForModel: number | null;
  plusForOpponent: number | null;
  judgeResponses: unknown;
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
  const [loadedJudges, setLoadedJudges] = useState<Record<number, JudgeResult[]>>({});
  const [loadingJudges, setLoadingJudges] = useState<Set<number>>(new Set());
  const [matchupSummaries, setMatchupSummaries] = useState<MatchupSummary[]>([]);
  const [loadingMatchups, setLoadingMatchups] = useState(false);
  const [expandedOpponent, setExpandedOpponent] = useState<string | null>(null);
  const [matchupDetails, setMatchupDetails] = useState<Record<string, MatchupDetail[]>>({});
  const [loadingOpponentDetails, setLoadingOpponentDetails] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modelName) {
      setLoading(true);
      setSamples([]);
      setExpandedItem("");
      setLoadedResponses({});
      setLoadingResponses(new Set());
      setLoadedJudges({});
      setLoadingJudges(new Set());
      setMatchupSummaries([]);
      setLoadingMatchups(false);
      setExpandedOpponent(null);
      setMatchupDetails({});
      setLoadingOpponentDetails(new Set());

      fetch(`/api/samples/${encodeURIComponent(modelName)}`)
        .then((res) => res.json())
        .then((data) => {
          setSamples(data.samples || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });

      // Load matchup summaries for this model
      setLoadingMatchups(true);
      fetch(`/api/matchups/${encodeURIComponent(modelName)}`)
        .then((res) => res.json())
        .then((data) => {
          setMatchupSummaries(data.summaries || []);
          setLoadingMatchups(false);
        })
        .catch(() => {
          setLoadingMatchups(false);
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

  const loadJudgeResults = async (taskId: number) => {
    if (loadedJudges[taskId] || loadingJudges.has(taskId)) return;

    setLoadingJudges((prev) => new Set(prev).add(taskId));

    try {
      const res = await fetch(`/api/samples/judges/${taskId}`);
      const data = await res.json();
      setLoadedJudges((prev) => ({
        ...prev,
        [taskId]: data.judges || [],
      }));
    } catch {
      // Failed to load judges
    } finally {
      setLoadingJudges((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const loadOpponentDetails = async (opponent: string) => {
    if (matchupDetails[opponent] || loadingOpponentDetails.has(opponent) || !modelName) return;

    setLoadingOpponentDetails((prev) => new Set(prev).add(opponent));

    try {
      const res = await fetch(
        `/api/matchups/${encodeURIComponent(modelName)}?opponent=${encodeURIComponent(opponent)}&limit=100`
      );
      const data = await res.json();
      setMatchupDetails((prev) => ({
        ...prev,
        [opponent]: data.details || [],
      }));
    } catch {
      // Failed to load details
    } finally {
      setLoadingOpponentDetails((prev) => {
        const next = new Set(prev);
        next.delete(opponent);
        return next;
      });
    }
  };

  const handleAccordionChange = (value: string) => {
    setExpandedItem(value);

    // Load response content and judge results when expanding
    if (value) {
      const taskId = parseInt(value, 10);
      if (!isNaN(taskId)) {
        loadSampleResponse(taskId);
        loadJudgeResults(taskId);
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

  const handleOpponentToggle = (opponent: string) => {
    if (expandedOpponent === opponent) {
      setExpandedOpponent(null);
    } else {
      setExpandedOpponent(opponent);
      loadOpponentDetails(opponent);
    }
  };

  return (
    <Dialog open={modelName !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-16px)] sm:w-[calc(100vw-100px)] sm:max-w-[1000px] h-[calc(100vh-100px)] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Writing Samples — {modelName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="samples" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 shrink-0 w-fit">
            <TabsTrigger value="samples">Samples</TabsTrigger>
            <TabsTrigger value="matchups">
              ELO Matchups
              {matchupSummaries.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({matchupSummaries.length})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="samples" className="flex-1 overflow-hidden mt-0">
            <div
              ref={scrollContainerRef}
              className="h-full overflow-y-auto px-6"
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

                            {/* Scores Section - collapsed by default */}
                            <JudgeScoresSection
                              aggregatedScores={sample.aggregated_scores}
                              loadedJudges={loadedJudges[sample.id]}
                              isLoading={loadingJudges.has(sample.id)}
                            />

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
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </TabsContent>

          <TabsContent value="matchups" className="flex-1 overflow-hidden mt-0">
            <div className="h-full overflow-y-auto px-6 py-4">
              {loadingMatchups ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : matchupSummaries.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No ELO matchups available for this model.
                </div>
              ) : (
                <div className="space-y-2">
                  {matchupSummaries.map((summary) => {
                    const isWinning = summary.winsForModel > summary.winsForOpponent;
                    const isLosing = summary.winsForModel < summary.winsForOpponent;
                    return (
                      <div key={summary.opponent} className="border rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleOpponentToggle(summary.opponent)}
                          className="w-full p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          {/* Desktop layout - single row */}
                          <div className="hidden sm:flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ChevronRight
                                className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                                  expandedOpponent === summary.opponent ? "rotate-90" : ""
                                }`}
                              />
                              <span className="font-medium text-sm">
                                vs {summary.opponent}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                ({summary.matchupCount} matchups)
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm shrink-0">
                              <div className="flex items-center gap-1">
                                {isWinning && <Trophy className="h-3.5 w-3.5 text-green-500" />}
                                <span className="text-xs text-muted-foreground">Us:</span>
                                <span className={`font-mono ${isWinning ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                                  {summary.winsForModel}
                                </span>
                              </div>
                              <span className="text-muted-foreground">|</span>
                              <div className="flex items-center gap-1">
                                {isLosing && <Trophy className="h-3.5 w-3.5 text-red-500" />}
                                <span className="text-xs text-muted-foreground">Them:</span>
                                <span className={`font-mono ${isLosing ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                                  {summary.winsForOpponent}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                ({(summary.avgFractionForModel * 100).toFixed(0)}%)
                              </span>
                            </div>
                          </div>

                          {/* Mobile layout - two rows */}
                          <div className="sm:hidden space-y-2">
                            <div className="flex items-start gap-2">
                              <ChevronRight
                                className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-0.5 ${
                                  expandedOpponent === summary.opponent ? "rotate-90" : ""
                                }`}
                              />
                              <div>
                                <span className="font-medium text-sm break-words">
                                  vs {summary.opponent}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({summary.matchupCount})
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm pl-6">
                              <div className="flex items-center gap-1">
                                {isWinning && <Trophy className="h-3.5 w-3.5 text-green-500" />}
                                <span className="text-xs text-muted-foreground">Us:</span>
                                <span className={`font-mono ${isWinning ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                                  {summary.winsForModel}
                                </span>
                              </div>
                              <span className="text-muted-foreground">|</span>
                              <div className="flex items-center gap-1">
                                {isLosing && <Trophy className="h-3.5 w-3.5 text-red-500" />}
                                <span className="text-xs text-muted-foreground">Them:</span>
                                <span className={`font-mono ${isLosing ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                                  {summary.winsForOpponent}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                ({(summary.avgFractionForModel * 100).toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                        </button>

                      {expandedOpponent === summary.opponent && (
                        <div className="border-t px-3 pb-3">
                          {loadingOpponentDetails.has(summary.opponent) ? (
                            <div className="py-3 space-y-2">
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                            </div>
                          ) : matchupDetails[summary.opponent]?.length > 0 ? (
                            <div className="pt-2 space-y-1">
                              {matchupDetails[summary.opponent].map((detail) => (
                                <MatchupDetailRow
                                  key={detail.id}
                                  detail={detail}
                                  viewedModelName={modelName}
                                  opponentModelName={summary.opponent}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="py-3 text-sm text-muted-foreground">
                              No matchup details available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
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

// Fields to exclude from judge scores display
const EXCLUDED_SCORE_FIELDS = new Set([
  "piece score 0 20",
  "per metric",
  "n judges",
  "ensemble mode",
  "analysis_text",
]);

// Parse analysis text from raw_judge_text (fallback when analysis_text key is missing)
function parseAnalysisFromRawText(rawText: string | null): string | null {
  if (!rawText) return null;

  // Look for [Analysis] section
  const analysisMatch = rawText.match(/\[Analysis\]\s*([\s\S]*?)(?=\[Scores\]|$)/i);
  if (analysisMatch && analysisMatch[1]) {
    return analysisMatch[1].trim();
  }

  return null;
}

function JudgeScoresSection({
  loadedJudges,
  isLoading,
}: {
  aggregatedScores: Record<string, number> | null;
  loadedJudges: JudgeResult[] | undefined;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedJudgeIndex, setSelectedJudgeIndex] = useState(0);

  // Filter valid judges that have scores
  const validJudges = loadedJudges?.filter(
    (j) => j.judge_scores && Object.keys(j.judge_scores).length > 0
  ) ?? [];

  // Get dimensions from the selected judge, filtering out excluded fields
  const selectedJudge = validJudges[selectedJudgeIndex];
  const dimensions = selectedJudge?.judge_scores
    ? Object.entries(selectedJudge.judge_scores)
        .filter(([key, value]) =>
          !key.startsWith("_") &&
          !EXCLUDED_SCORE_FIELDS.has(key) &&
          typeof value === "number" &&
          !isNaN(value)
        )
        .sort(([a], [b]) => a.localeCompare(b))
    : [];

  // Get analysis text - prefer analysis_text from judge_scores, fallback to parsing raw_judge_text
  const analysisText = selectedJudge?.judge_scores?.analysis_text as string | undefined
    ?? parseAnalysisFromRawText(selectedJudge?.raw_judge_text ?? null);

  // Scale score from 0-20 to 0-100
  const scaleScore = (score: number) => score * 5;

  // Get bar color based on score (0-100 scale)
  const getBarColor = (score: number) => {
    const scaled = scaleScore(score);
    if (scaled >= 80) return "bg-green-500";
    if (scaled >= 60) return "bg-yellow-500";
    if (scaled >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground">SCORES</div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-5/6" />
        </div>
      </div>
    );
  }

  if (validJudges.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <span className="text-xs font-medium text-muted-foreground">SCORES</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Judge tabs - scrollable on mobile */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {validJudges.map((judge, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedJudgeIndex(idx)}
                className={`shrink-0 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                  selectedJudgeIndex === idx
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                {judge.judge_model_name.length > 20
                  ? judge.judge_model_name.slice(0, 18) + "..."
                  : judge.judge_model_name}
              </button>
            ))}
          </div>

          {/* Horizontal bar chart for selected judge */}
          <div className="space-y-2">
            {dimensions.map(([key, value]) => {
              const scaled = scaleScore(value as number);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground capitalize truncate mr-2">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono font-medium shrink-0">
                      {scaled.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getBarColor(value as number)}`}
                      style={{ width: `${Math.min(100, Math.max(0, scaled))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Analysis text */}
          {analysisText && (
            <div className="pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                ANALYSIS
              </div>
              <div className="bg-muted/30 rounded p-3">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {analysisText}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchupDetailRow({
  detail,
  viewedModelName,
  opponentModelName,
}: {
  detail: MatchupDetail;
  viewedModelName: string | null;
  opponentModelName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const winPercent = detail.fractionForModel !== null ? detail.fractionForModel * 100 : null;
  const plusUs = detail.plusForModel;
  const plusThem = detail.plusForOpponent;

  // Get result label - only exact 50% is a draw
  const getResultLabel = () => {
    if (winPercent === null) return "Unknown";
    if (winPercent === 50) return "Draw";
    if (winPercent > 50) return "Win";
    return "Loss";
  };

  const getResultColor = () => {
    if (winPercent === null) return "text-muted-foreground";
    if (winPercent === 50) return "text-yellow-600 dark:text-yellow-400";
    if (winPercent > 50) return "text-green-600 dark:text-green-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="rounded border bg-muted/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2 text-left hover:bg-muted/30 transition-colors cursor-pointer text-xs"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`h-3 w-3 text-muted-foreground transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
          <span className="text-muted-foreground">Item:</span>
          <span className="font-medium truncate max-w-[200px]">{detail.item_id}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-medium ${getResultColor()}`}>
            {getResultLabel()}
          </span>
          {winPercent !== null && (
            <span className="text-muted-foreground font-mono">
              {winPercent.toFixed(0)}%
            </span>
          )}
          {plusUs !== null && plusThem !== null && (
            <span className="text-muted-foreground">
              (Us: {plusUs} | Them: {plusThem})
            </span>
          )}
        </div>
      </button>

      {expanded && detail.judgeResponses != null && (
        <div className="border-t px-3 py-2 text-xs space-y-3">
          <JudgeResponsesDisplay
            responses={detail.judgeResponses}
            viewedModelName={viewedModelName}
            opponentModelName={opponentModelName}
            isViewedModelA={detail.isModelA}
          />
        </div>
      )}
    </div>
  );
}

interface JudgeResponseItem {
  judge_name: string;
  judge_response: {
    chain_of_thought_reasoning?: string;
    [key: string]: unknown;
  };
  order?: string; // e.g. "A0493:test / A0488:other"
  plus_for_test: number;
  plus_for_other: number;
  outcome: number;
}

function JudgeResponsesDisplay({
  responses,
  viewedModelName,
  opponentModelName,
  isViewedModelA,
}: {
  responses: unknown;
  viewedModelName: string | null;
  opponentModelName: string;
  isViewedModelA: boolean;
}) {
  // Parse the array of judge responses
  const responseArray: JudgeResponseItem[] = Array.isArray(responses)
    ? responses
    : [];

  if (responseArray.length === 0) {
    return <div className="text-muted-foreground">No judge responses available</div>;
  }

  // Parse dimension score like "A0493++" or "B1234-"
  const parseDimensionScore = (value: string): { modelCode: string; magnitude: number; magnitudeStr: string } | null => {
    if (typeof value !== "string") return null;
    const match = value.match(/^([AB]\d+)([\+\-]*)$/);
    if (!match) return null;
    const magnitudeStr = match[2] || "";
    // Count +'s as positive, -'s as negative
    const magnitude = magnitudeStr.split("").reduce((sum, char) => {
      if (char === "+") return sum + 1;
      if (char === "-") return sum - 1;
      return sum;
    }, 0);
    return {
      modelCode: match[1],
      magnitude,
      magnitudeStr,
    };
  };

  // Parse order field like "A0493:test / A0488:other" to extract model codes
  const parseOrderField = (order: string | undefined): Map<string, "test" | "other"> | null => {
    if (!order) return null;
    const mapping = new Map<string, "test" | "other">();
    const parts = order.split("/").map(s => s.trim());
    for (const part of parts) {
      const match = part.match(/^([AB]\d+):(\w+)$/);
      if (match) {
        const role = match[2].toLowerCase();
        if (role === "test" || role === "other") {
          mapping.set(match[1], role);
        }
      }
    }
    return mapping.size > 0 ? mapping : null;
  };

  // "Negative" dimensions where the loser also gets penalized
  const NEGATIVE_DIMENSIONS = new Set([
    "avoids_poetic_overload",
    "coherence",
    "avoids_verbosity",
  ]);

  // Infer mapping by calculating totals and matching to plus_for_test/plus_for_other
  // This is needed when the order field is missing
  const inferMapping = (
    dimensions: Array<{ key: string; modelCode: string; magnitude: number }>,
    plusForTest: number,
    plusForOther: number
  ): Map<string, "test" | "other"> | null => {
    // Get unique model codes
    const codes = [...new Set(dimensions.map(d => d.modelCode))];
    if (codes.length === 0) return null;

    // Calculate totals assuming a given code is "test"
    // For regular dimensions: winner gets +magnitude
    // For negative dimensions: winner gets +magnitude, loser gets -magnitude
    const calculateTotals = (testCode: string) => {
      let testTotal = 0;
      let otherTotal = 0;

      for (const dim of dimensions) {
        const isNegative = NEGATIVE_DIMENSIONS.has(dim.key);
        if (dim.modelCode === testCode) {
          // test won this dimension
          testTotal += dim.magnitude;
          if (isNegative) {
            otherTotal -= dim.magnitude;
          }
        } else {
          // other won this dimension
          otherTotal += dim.magnitude;
          if (isNegative) {
            testTotal -= dim.magnitude;
          }
        }
      }

      return { testTotal, otherTotal };
    };

    // Handle case where one model won ALL dimensions (only one code present)
    if (codes.length === 1) {
      const code = codes[0];
      // Try this code as test
      const totals = calculateTotals(code);
      if (totals.testTotal === plusForTest && totals.otherTotal === plusForOther) {
        const mapping = new Map<string, "test" | "other">();
        mapping.set(code, "test");
        return mapping;
      }
      // Try this code as other (swap the expected values)
      if (totals.otherTotal === plusForTest && totals.testTotal === plusForOther) {
        const mapping = new Map<string, "test" | "other">();
        mapping.set(code, "other");
        return mapping;
      }
      return null;
    }

    const [code1, code2] = codes;

    // Try code1 as test
    const totals1 = calculateTotals(code1);
    if (totals1.testTotal === plusForTest && totals1.otherTotal === plusForOther) {
      const mapping = new Map<string, "test" | "other">();
      mapping.set(code1, "test");
      mapping.set(code2, "other");
      return mapping;
    }

    // Try code2 as test
    const totals2 = calculateTotals(code2);
    if (totals2.testTotal === plusForTest && totals2.otherTotal === plusForOther) {
      const mapping = new Map<string, "test" | "other">();
      mapping.set(code2, "test");
      mapping.set(code1, "other");
      return mapping;
    }

    return null;
  };

  // Get dimension entries from judge_response (excluding chain_of_thought_reasoning)
  const getDimensions = (judgeResponse: Record<string, unknown>) => {
    return Object.entries(judgeResponse)
      .filter(([key, value]) => key !== "chain_of_thought_reasoning" && typeof value === "string")
      .map(([key, value]) => ({
        key,
        value: value as string,
        parsed: parseDimensionScore(value as string),
      }))
      .filter((d): d is { key: string; value: string; parsed: NonNullable<ReturnType<typeof parseDimensionScore>> } =>
        d.parsed !== null
      );
  };

  return (
    <div className="space-y-4">
      {responseArray.map((item, idx) => {
        const judgeResponse = item.judge_response || {};
        const dimensions = getDimensions(judgeResponse);
        const hasReasoning = judgeResponse.chain_of_thought_reasoning &&
          typeof judgeResponse.chain_of_thought_reasoning === "string" &&
          judgeResponse.chain_of_thought_reasoning.length > 0;

        // Get the code-to-role mapping from the order field, or infer it from dimension totals
        // "test" in the mapping always refers to model_a in the comparison
        let codeToRoleMapping = parseOrderField(item.order);
        if (!codeToRoleMapping) {
          // Fallback: infer mapping by matching dimension totals to plus_for_test/plus_for_other
          codeToRoleMapping = inferMapping(
            dimensions.map(d => ({ key: d.key, modelCode: d.parsed.modelCode, magnitude: d.parsed.magnitude })),
            item.plus_for_test,
            item.plus_for_other
          );
        }

        // Determine if each dimension was won by the viewed model
        // - If isViewedModelA: viewed model is "test", so "test" wins are our wins
        // - If !isViewedModelA: viewed model is "other", so "other" wins are our wins
        const isWinForViewed = (role: "test" | "other") => {
          return isViewedModelA ? role === "test" : role === "other";
        };

        return (
          <div key={idx} className="space-y-2">
            {/* Judge name header */}
            <div className="font-medium text-xs text-muted-foreground">
              Judge: {item.judge_name || `#${idx + 1}`}
            </div>

            {/* Dimension scores - flat grid, no extra box */}
            {dimensions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {dimensions.map(({ key, parsed }) => {
                  const role = codeToRoleMapping?.get(parsed.modelCode);
                  const isWin = role ? isWinForViewed(role) : null;
                  // If we can't determine, show the raw model code
                  const label = isWin === true ? "Win" : isWin === false ? "Loss" : parsed.modelCode;

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-muted/30 rounded px-2 py-1"
                    >
                      <span className="capitalize truncate mr-2">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`font-mono font-medium shrink-0 ${
                          isWin === true
                            ? "text-green-600 dark:text-green-400"
                            : isWin === false
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {label}
                        {parsed.magnitudeStr && (
                          <span className="text-muted-foreground ml-0.5">
                            {parsed.magnitudeStr}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Chain of thought reasoning - always shown */}
            {hasReasoning && (() => {
              // Substitute model codes with actual model names in reasoning text
              let reasoningText = judgeResponse.chain_of_thought_reasoning as string;
              if (codeToRoleMapping) {
                for (const [code, role] of codeToRoleMapping.entries()) {
                  // Map role to actual model name based on isViewedModelA
                  // - "test" role = model_a = viewedModel if isViewedModelA, else opponent
                  // - "other" role = model_b = opponent if isViewedModelA, else viewedModel
                  const displayName = role === "test"
                    ? (isViewedModelA ? (viewedModelName || "Test Model") : opponentModelName)
                    : (isViewedModelA ? opponentModelName : (viewedModelName || "Test Model"));
                  reasoningText = reasoningText.replace(
                    new RegExp(`\\b${code}\\b`, "g"),
                    displayName
                  );
                }
              }
              return (
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground mb-2">
                    Reasoning
                  </div>
                  <div className="bg-muted/30 rounded p-3">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {reasoningText}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
