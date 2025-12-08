"use client";

import { useState } from "react";
import { FileText, BarChart3, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SamplesModal } from "@/components/samples-modal";
import { AnalysisModal } from "@/components/analysis-modal";

interface Rating {
  model_name: string;
  elo: number | null;
  elo_norm: number | null;
  ci_low: number | null;
  ci_high: number | null;
}

interface LeaderboardProps {
  ratings: Rating[];
}

/**
 * Extract the Hugging Face model page URL from various model name formats:
 * - "deepseek-ai/DeepSeek-V3.2" -> "https://huggingface.co/deepseek-ai/DeepSeek-V3.2"
 * - "deepseek-ai/DeepSeek-V3.2:*Q3_K_M.gguf" -> "https://huggingface.co/deepseek-ai/DeepSeek-V3.2"
 * - "https://huggingface.co/unsloth/Qwen3-Next-80B-A3B-Instruct-GGUF/tree/main/Q8_0:*Q8_0*.gguf" -> "https://huggingface.co/unsloth/Qwen3-Next-80B-A3B-Instruct-GGUF"
 */
function getHuggingFaceUrl(modelName: string): string {
  // If it's already a full URL, extract org/model from the path
  if (modelName.startsWith("https://huggingface.co/")) {
    const urlPath = modelName.replace("https://huggingface.co/", "");
    // Extract just org/model (first two path segments)
    const parts = urlPath.split("/");
    if (parts.length >= 2) {
      return `https://huggingface.co/${parts[0]}/${parts[1]}`;
    }
    return modelName.split(":")[0]; // fallback
  }

  // Remove any filename pattern suffix (after colon)
  const baseModel = modelName.split(":")[0];

  return `https://huggingface.co/${baseModel}`;
}

export function Leaderboard({ ratings }: LeaderboardProps) {
  const [samplesModalModel, setSamplesModalModel] = useState<string | null>(null);
  const [analysisModalModel, setAnalysisModalModel] = useState<string | null>(null);

  const maxElo = Math.max(...ratings.map((r) => r.elo ?? 0));
  const minElo = Math.min(...ratings.map((r) => r.elo ?? 0));
  const eloRange = maxElo - minElo || 1;

  const getEloBarWidth = (elo: number | null) => {
    if (elo === null) return 0;
    return ((elo - minElo) / eloRange) * 100;
  };

  const getRankBadgeVariant = (rank: number) => {
    if (rank === 1) return "default";
    if (rank <= 3) return "secondary";
    return "outline";
  };

  return (
    <>
      <div className="rounded-lg border-2 border-violet-400/50 dark:border-violet-400/70 bg-card shadow-[0_0_15px_rgba(167,139,250,0.15)] dark:shadow-[0_0_15px_rgba(167,139,250,0.3)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead className="min-w-[200px] w-[60%]">Model</TableHead>
              <TableHead className="min-w-[200px] w-[40%]">ELO Score</TableHead>
              <TableHead className="w-24 text-center"><span className="hidden sm:inline">Samples</span></TableHead>
              <TableHead className="w-24 text-center"><span className="hidden sm:inline">Analysis</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ratings.map((rating, index) => {
              const rank = index + 1;
              return (
                <TableRow key={rating.model_name}>
                  <TableCell>
                    <Badge variant={getRankBadgeVariant(rank)} className="font-mono">
                      {rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium whitespace-normal break-all">
                    <a
                      href={getHuggingFaceUrl(rating.model_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline"
                    >
                      {rating.model_name}
                      <ExternalLink className="h-3.5 w-3.5 inline-block ml-1.5 flex-shrink-0 opacity-50" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-chart-1 to-chart-2 transition-all"
                          style={{ width: `${getEloBarWidth(rating.elo)}%` }}
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-sm">
                        {rating.elo?.toFixed(0) ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer hover:bg-accent/80"
                      onClick={() => setSamplesModalModel(rating.model_name)}
                      title="View writing samples"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer hover:bg-accent/80"
                      onClick={() => setAnalysisModalModel(rating.model_name)}
                      title="View lexical analysis"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <SamplesModal
        modelName={samplesModalModel}
        onClose={() => setSamplesModalModel(null)}
      />

      <AnalysisModal
        modelName={analysisModalModel}
        onClose={() => setAnalysisModalModel(null)}
      />
    </>
  );
}
