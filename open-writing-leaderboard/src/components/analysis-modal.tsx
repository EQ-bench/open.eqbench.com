"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface LexicalAnalysis {
  slop_words_per_1k: number;
  slop_trigrams_per_1k: number;
  not_x_but_y_per_1k_chars: number;
  slop_score: number;
  vocab_level: number;
  avg_sentence_length: number;
  avg_paragraph_length: number;
  mattr_500: number;
  avg_turn_length: number;
  num_turns: number;
  total_words: number;
  total_chars: number;
}

interface ModelData {
  model: string;
  lexical_analysis: LexicalAnalysis;
}

interface LexicalResponse {
  models: ModelData[];
  ranges: Record<string, { min: number; max: number }>;
}

interface AnalysisModalProps {
  modelName: string | null;
  onClose: () => void;
}

const METRIC_CONFIG: Record<
  keyof LexicalAnalysis,
  { label: string; description: string; lowerIsBetter?: boolean; decimals?: number }
> = {
  slop_words_per_1k: {
    label: "Slop Words / 1k",
    description: "Overused words per 1,000 words",
    lowerIsBetter: true,
    decimals: 2,
  },
  slop_trigrams_per_1k: {
    label: "Slop Trigrams / 1k",
    description: "Cliched phrases per 1,000 words",
    lowerIsBetter: true,
    decimals: 2,
  },
  not_x_but_y_per_1k_chars: {
    label: '"Not X but Y" / 1k chars',
    description: "Frequency of this pattern per 1,000 characters",
    lowerIsBetter: true,
    decimals: 3,
  },
  slop_score: {
    label: "Slop Score",
    description: "Overall sloppiness score",
    lowerIsBetter: true,
    decimals: 2,
  },
  vocab_level: {
    label: "Vocabulary Level",
    description: "Lexical sophistication (higher = more advanced vocabulary)",
    decimals: 2,
  },
  avg_sentence_length: {
    label: "Avg Sentence Length",
    description: "Average number of words per sentence",
    decimals: 1,
  },
  avg_paragraph_length: {
    label: "Avg Paragraph Length",
    description: "Average number of sentences per paragraph",
    decimals: 1,
  },
  mattr_500: {
    label: "MATTR-500",
    description: "Moving average type-token ratio (lexical diversity)",
    decimals: 3,
  },
  avg_turn_length: {
    label: "Avg Turn Length",
    description: "Average characters per response turn",
    decimals: 0,
  },
  num_turns: {
    label: "Number of Turns",
    description: "Total response turns analyzed",
    decimals: 0,
  },
  total_words: {
    label: "Total Words",
    description: "Total words analyzed",
    decimals: 0,
  },
  total_chars: {
    label: "Total Characters",
    description: "Total characters analyzed",
    decimals: 0,
  },
};

const DISPLAY_METRICS: (keyof LexicalAnalysis)[] = [
  "slop_words_per_1k",
  "slop_trigrams_per_1k",
  "not_x_but_y_per_1k_chars",
  "slop_score",
  "vocab_level",
  "avg_sentence_length",
  "avg_paragraph_length",
  "mattr_500",
  "avg_turn_length",
];

export function AnalysisModal({ modelName, onClose }: AnalysisModalProps) {
  const [data, setData] = useState<LexicalResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (modelName) {
      setLoading(true);
      fetch("/api/lexical-analysis")
        .then((res) => res.json())
        .then((responseData: LexicalResponse) => {
          setData(responseData);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [modelName]);

  const selectedModel = data?.models.find((m) => m.model === modelName);

  const getNormalizedWidth = (metric: keyof LexicalAnalysis, value: number) => {
    const range = data?.ranges[metric];
    if (!range || range.max === range.min) return 50;
    return ((value - range.min) / (range.max - range.min)) * 100;
  };

  const formatValue = (metric: keyof LexicalAnalysis, value: number) => {
    const decimals = METRIC_CONFIG[metric].decimals ?? 2;
    return value.toFixed(decimals);
  };

  return (
    <Dialog open={modelName !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lexical Analysis — {modelName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : !selectedModel ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
              <p>No lexical analysis data available for this model.</p>
            </div>
          ) : (
            <div className="space-y-6 p-4">
              {DISPLAY_METRICS.map((metric) => {
                const value = selectedModel.lexical_analysis[metric];
                const config = METRIC_CONFIG[metric];
                const range = data?.ranges[metric];
                const width = getNormalizedWidth(metric, value);

                return (
                  <div key={metric} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{config.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {config.description}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-medium">
                          {formatValue(metric, value)}
                        </div>
                        {range && (
                          <div className="text-xs text-muted-foreground">
                            range: {formatValue(metric, range.min)} - {formatValue(metric, range.max)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative h-6 overflow-hidden rounded bg-muted">
                      <div
                        className={`absolute inset-y-0 left-0 rounded transition-all ${
                          config.lowerIsBetter
                            ? "bg-gradient-to-r from-green-500 to-red-500"
                            : "bg-gradient-to-r from-chart-1 to-chart-2"
                        }`}
                        style={{ width: `${width}%` }}
                      />
                      <div
                        className="absolute inset-y-0 flex items-center px-2 text-xs font-mono font-medium"
                        style={{
                          left: `${Math.min(width, 85)}%`,
                          color: width > 50 ? "white" : "inherit",
                        }}
                      >
                        {formatValue(metric, value)}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="border-t pt-6 mt-6">
                <h3 className="text-sm font-medium mb-4 text-muted-foreground">
                  CORPUS STATISTICS
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-mono font-bold">
                      {selectedModel.lexical_analysis.total_words.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Total Words</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-mono font-bold">
                      {selectedModel.lexical_analysis.total_chars.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Total Characters</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-mono font-bold">
                      {selectedModel.lexical_analysis.num_turns.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Response Turns</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
