"use client";

import { useState } from "react";
import { FileText, BarChart3, ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  ScoreBarPaletteSelector,
  scoreBarPalettes,
} from "@/components/score-bar-palette-selector";

interface Rating {
  model_name: string;
  elo: number | null;
  elo_norm: number | null;
  ci_low: number | null;
  ci_high: number | null;
}

interface LeaderboardWithPaletteProps {
  ratings: Rating[];
  isAdmin?: boolean;
}

function getHuggingFaceUrl(modelName: string): string {
  if (modelName.startsWith("https://huggingface.co/")) {
    const urlPath = modelName.replace("https://huggingface.co/", "");
    const parts = urlPath.split("/");
    if (parts.length >= 2) {
      return `https://huggingface.co/${parts[0]}/${parts[1]}`;
    }
    return modelName.split(":")[0];
  }
  const baseModel = modelName.split(":")[0];
  return `https://huggingface.co/${baseModel}`;
}

export function LeaderboardWithPalette({ ratings, isAdmin }: LeaderboardWithPaletteProps) {
  const router = useRouter();
  const [samplesModalModel, setSamplesModalModel] = useState<string | null>(null);
  const [analysisModalModel, setAnalysisModalModel] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);
  const [paletteId, setPaletteId] = useState("purple-to-pink");

  const palette = scoreBarPalettes.find((p) => p.id === paletteId) ?? scoreBarPalettes[0];

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete "${modelName}" from the leaderboard?\n\nThis will also delete all associated runs and data. This action cannot be undone.`)) {
      return;
    }

    setDeletingModel(modelName);
    try {
      const response = await fetch(`/api/admin/leaderboard?model=${encodeURIComponent(modelName)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to delete");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete leaderboard entry");
    } finally {
      setDeletingModel(null);
    }
  };

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
      {/* <ScoreBarPaletteSelector value={paletteId} onChange={setPaletteId} /> */}

      <p className="text-center text-sm text-muted-foreground mb-4">
        [BETA] Leaderboard will reset at launch
      </p>
      <div className="rounded-lg border-2 border-violet-400/50 dark:border-violet-400/70 bg-card shadow-[0_0_15px_rgba(167,139,250,0.15)] dark:shadow-[0_0_15px_rgba(167,139,250,0.3)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16"><span className="hidden sm:inline">Rank</span></TableHead>
              <TableHead className="min-w-[133px] w-[60%]">Model</TableHead>
              <TableHead className="min-w-[70px] w-[40%]">ELO Score</TableHead>
              <TableHead className="w-10 sm:w-24 text-center"><span className="hidden sm:inline">Samples</span></TableHead>
              <TableHead className="w-10 sm:w-24 text-center"><span className="hidden sm:inline">Analysis</span></TableHead>
              {isAdmin && <TableHead className="w-10 sm:w-16 text-center"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ratings.map((rating, index) => {
              const rank = index + 1;
              return (
                <TableRow key={rating.model_name}>
                  <TableCell className="pr-0 sm:pr-2">
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
                    <div className="flex items-center gap-0.5 sm:gap-3">
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`absolute inset-y-0 left-0 h-full rounded-full transition-all ${palette.gradient} border border-[#000] dark:border-0`}
                          style={{
                            width: `${getEloBarWidth(rating.elo)}%`,
                            backgroundSize: getEloBarWidth(rating.elo) > 0
                              ? `${100 / (getEloBarWidth(rating.elo) / 100)}% 100%`
                              : '100% 100%',
                            backgroundPosition: 'left',
                          }}
                        />
                      </div>
                      <span className="w-12 sm:w-16 text-right font-mono text-sm">
                        {rating.elo?.toFixed(0) ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-0 sm:px-2">
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
                  <TableCell className="text-center px-0 sm:px-2">
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
                  {isAdmin && (
                    <TableCell className="text-center px-0 sm:px-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(rating.model_name)}
                        disabled={deletingModel === rating.model_name}
                        title="Delete from leaderboard"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
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
